<?php
/**
 * Plugin Name: SmartCell — Чернетка перекладу
 * Description: Для qTranslate-XT / qTranslate-X. Галочка в редакторі копіює український текст у порожні мовні версії запису (заголовок, текст, уривок, поля ACF), щоб перекладач бачив структуру й писав поверх. Поки версія позначена «не перекладено», вона закрита від індексації.
 * Version: 1.0.0
 * Author: SmartCell
 * Requires PHP: 7.2
 * Text Domain: smartcell-translate-draft
 *
 * Как устроено (подробно — docs/translate-draft/README.md в ките):
 *  - копирует ТОЛЬКО по галочке и ТОЛЬКО в пустые языки: готовый перевод не трогается;
 *  - источник — язык по умолчанию qTranslate, цели — остальные включённые языки;
 *  - поля с языковыми метками ([:uk]…[:], <!--:uk-->…, {:uk}…). Текст без меток qTranslate
 *    и так показывает на всех языках, его не трогаем;
 *  - после копирования у записи пометка «не перекладено» (_sc_td_draft) по языкам;
 *    пока она стоит, эта языковая версия отдаёт noindex. Снимает переводчик в редакторе.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SC_TD_META', '_sc_td_draft' );

/* ---------- Языки ---------- */

/** Источник и цели: язык по умолчанию qTranslate → остальные включённые. */
function sc_td_langs() {
	global $q_config;
	$source  = ! empty( $q_config['default_language'] ) ? $q_config['default_language'] : 'uk';
	$enabled = ! empty( $q_config['enabled_languages'] ) ? array_values( (array) $q_config['enabled_languages'] ) : array( $source, 'ru', 'en' );
	$langs   = array(
		'source'  => $source,
		'targets' => array_values( array_diff( $enabled, array( $source ) ) ),
		'order'   => $enabled,
	);
	return apply_filters( 'sc_td_langs', $langs );
}

function sc_td_lang_name( $lang ) {
	if ( function_exists( 'qtranxf_getLanguageNameNative' ) ) {
		$name = qtranxf_getLanguageNameNative( $lang );
		if ( $name ) {
			return $name;
		}
	}
	return strtoupper( $lang );
}

/** Язык текущей страницы на сайте. */
function sc_td_current_lang() {
	if ( function_exists( 'qtranxf_getLanguage' ) ) {
		$lang = qtranxf_getLanguage();
	} elseif ( function_exists( 'qtrans_getLanguage' ) ) {
		$lang = qtrans_getLanguage();
	} else {
		$lang = substr( get_locale(), 0, 2 );
	}
	return apply_filters( 'sc_td_current_lang', $lang );
}

/* ---------- Разбор и сборка многоязычной строки ---------- */

function sc_td_tag_regex() {
	return '#(<!--:[a-z]{2,3}(?:[-_][a-z]{2,4})?-->|<!--:-->|\[:[a-z]{2,3}(?:[-_][a-z]{2,4})?\]|\[:\]|\{:[a-z]{2,3}(?:[-_][a-z]{2,4})?\}|\{:\})#i';
}

function sc_td_is_multilingual( $s ) {
	return is_string( $s ) && preg_match( '#<!--:[a-z]{2,3}(?:[-_][a-z]{2,4})?-->|\[:[a-z]{2,3}(?:[-_][a-z]{2,4})?\]|\{:[a-z]{2,3}(?:[-_][a-z]{2,4})?\}#i', $s );
}

/**
 * Строка с метками → массив язык => текст.
 * Текст вне меток qTranslate относит ко всем языкам — так же и здесь.
 */
function sc_td_split( $text, $langs ) {
	$result = array();
	foreach ( $langs as $l ) {
		$result[ $l ] = '';
	}
	$current = false;
	foreach ( preg_split( sc_td_tag_regex(), $text, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE ) as $block ) {
		if ( preg_match( '#^(?:<!--:([a-z_-]+)-->|\[:([a-z_-]+)\]|\{:([a-z_-]+)\})$#i', $block, $m ) ) {
			$current = $m[1] . ( isset( $m[2] ) ? $m[2] : '' ) . ( isset( $m[3] ) ? $m[3] : '' );
			continue;
		}
		if ( in_array( $block, array( '[:]', '{:}', '<!--:-->' ), true ) ) {
			$current = false;
			continue;
		}
		if ( $current ) {
			$result[ $current ] = ( isset( $result[ $current ] ) ? $result[ $current ] : '' ) . $block;
		} else {
			foreach ( array_keys( $result ) as $l ) {
				$result[ $l ] .= $block;
			}
		}
	}
	return array_map( 'trim', $result );
}

/** Массив язык => текст → [:uk]…[:ru]…[:]. Метки пишем всегда, даже если тексты совпали. */
function sc_td_join( $texts, $order ) {
	$out = '';
	foreach ( array_unique( array_merge( $order, array_keys( $texts ) ) ) as $l ) {
		if ( isset( $texts[ $l ] ) && '' !== $texts[ $l ] ) {
			$out .= '[:' . $l . ']' . $texts[ $l ];
		}
	}
	return '' === $out ? '' : $out . '[:]';
}

/** Пустой ли перевод: пробелы, nbsp и пустые теги не считаются текстом. */
function sc_td_is_empty( $html ) {
	if ( preg_match( '#<(img|iframe|video|audio|embed|object)\b#i', $html ) ) {
		return false;
	}
	$text = wp_strip_all_tags( strip_shortcodes( $html ) );
	$text = str_replace( array( '&nbsp;', "\xC2\xA0" ), ' ', $text );
	return '' === trim( $text );
}

/**
 * Заполнить пустые языки текстом источника.
 * $filled — какие языки реально получили копию (для пометки).
 */
function sc_td_fill( $value, &$filled ) {
	if ( ! sc_td_is_multilingual( $value ) ) {
		return $value;
	}
	$cfg   = sc_td_langs();
	$parts = sc_td_split( $value, $cfg['order'] );
	if ( ! isset( $parts[ $cfg['source'] ] ) || sc_td_is_empty( $parts[ $cfg['source'] ] ) ) {
		return $value;
	}
	$changed = false;
	foreach ( $cfg['targets'] as $l ) {
		if ( ! isset( $parts[ $l ] ) || sc_td_is_empty( $parts[ $l ] ) ) {
			$parts[ $l ]  = $parts[ $cfg['source'] ];
			$filled[ $l ] = true;
			$changed      = true;
		}
	}
	return $changed ? sc_td_join( $parts, $cfg['order'] ) : $value;
}

/* ---------- Редактор: галочка и пометки ---------- */

function sc_td_post_types() {
	return apply_filters( 'sc_td_post_types', array( 'post', 'page' ) );
}

add_action( 'add_meta_boxes', 'sc_td_metabox' );
function sc_td_metabox() {
	foreach ( sc_td_post_types() as $type ) {
		add_meta_box( 'sc_td', 'Переклад', 'sc_td_metabox_html', $type, 'side', 'high' );
	}
}

function sc_td_metabox_html( $post ) {
	$cfg   = sc_td_langs();
	$draft = (array) get_post_meta( $post->ID, SC_TD_META, true );
	$names = implode( ', ', array_map( 'sc_td_lang_name', $cfg['targets'] ) );
	wp_nonce_field( 'sc_td', 'sc_td_nonce' );
	echo '<p><label><input type="checkbox" name="sc_td_copy" value="1"> Скопіювати текст «' . esc_html( sc_td_lang_name( $cfg['source'] ) ) . '» у порожні версії (' . esc_html( $names ) . ') при збереженні</label></p>';
	echo '<p class="description">Заповнюються лише порожні поля, готовий переклад не змінюється.</p>';
	echo '<p style="margin-top:1em"><strong>Ще не перекладено</strong></p>';
	foreach ( $cfg['targets'] as $l ) {
		echo '<label style="display:block"><input type="checkbox" name="sc_td_draft[]" value="' . esc_attr( $l ) . '"' . checked( in_array( $l, $draft, true ), true, false ) . '> ' . esc_html( sc_td_lang_name( $l ) ) . '</label>';
	}
	echo '<p class="description">Поки галочка стоїть, ця мовна версія закрита від пошукових систем. Зніміть, коли переклад готовий.</p>';
}

/** Галочка «скопировать» отмечена в текущем запросе сохранения. */
function sc_td_copy_requested() {
	return isset( $_POST['sc_td_copy'], $_POST['sc_td_nonce'] ) && wp_verify_nonce( sanitize_key( $_POST['sc_td_nonce'] ), 'sc_td' );
}

/** Языки, получившие копию в этом запросе (заголовок/текст + поля). */
function sc_td_filled( $add = null ) {
	static $filled = array();
	if ( is_array( $add ) ) {
		$filled = array_merge( $filled, $add );
	}
	return $filled;
}

/** Заголовок, текст, отрывок — до записи в базу. qTranslate к этому моменту уже собрал вкладки в одну строку. */
add_filter( 'wp_insert_post_data', 'sc_td_insert_post_data', 99, 2 );
function sc_td_insert_post_data( $data, $postarr ) {
	if ( ! sc_td_copy_requested() || 'revision' === $data['post_type'] || ! in_array( $data['post_type'], sc_td_post_types(), true ) ) {
		return $data;
	}
	$filled = array();
	foreach ( array( 'post_title', 'post_content', 'post_excerpt' ) as $field ) {
		if ( isset( $data[ $field ] ) ) {
			$data[ $field ] = wp_slash( sc_td_fill( wp_unslash( $data[ $field ] ), $filled ) );
		}
	}
	sc_td_filled( $filled );
	return $data;
}

/** Поля (ACF и прочие) — после того как ACF их сохранил; затем пометки. */
add_action( 'save_post', 'sc_td_save_post', 100, 2 );
function sc_td_save_post( $post_id, $post ) {
	if ( ! isset( $_POST['sc_td_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['sc_td_nonce'] ), 'sc_td' ) ) {
		return;
	}
	if ( wp_is_post_revision( $post_id ) || ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	$filled = array();
	if ( sc_td_copy_requested() ) {
		foreach ( get_post_meta( $post_id ) as $key => $values ) {
			// служебные поля WordPress и ACF (_edit_lock, _field_name → field_xxx) не трогаем
			if ( '_' === $key[0] || 1 !== count( $values ) || is_serialized( $values[0] ) ) {
				continue;
			}
			$new = sc_td_fill( $values[0], $filled );
			if ( $new !== $values[0] ) {
				update_post_meta( $post_id, $key, wp_slash( $new ) );
			}
		}
		$filled = array_merge( $filled, sc_td_filled() );
	}

	// пометки: то, что оставил переводчик, плюс языки, которые только что получили копию
	$cfg   = sc_td_langs();
	$keep  = isset( $_POST['sc_td_draft'] ) ? array_map( 'sanitize_key', (array) wp_unslash( $_POST['sc_td_draft'] ) ) : array();
	$draft = array_values( array_intersect( $cfg['targets'], array_unique( array_merge( $keep, array_keys( $filled ) ) ) ) );
	if ( $draft ) {
		update_post_meta( $post_id, SC_TD_META, $draft );
	} else {
		delete_post_meta( $post_id, SC_TD_META );
	}
}

/* ---------- Список записей: колонка «Переклад» ---------- */

foreach ( array( 'post', 'page' ) as $sc_td_type ) {
	add_filter( "manage_{$sc_td_type}_posts_columns", 'sc_td_column' );
	add_action( "manage_{$sc_td_type}_posts_custom_column", 'sc_td_column_html', 10, 2 );
}
function sc_td_column( $cols ) {
	$cols['sc_td'] = 'Переклад';
	return $cols;
}
function sc_td_column_html( $col, $post_id ) {
	if ( 'sc_td' !== $col ) {
		return;
	}
	$draft = (array) get_post_meta( $post_id, SC_TD_META, true );
	$draft = array_filter( $draft );
	echo $draft ? 'Не перекладено: ' . esc_html( strtoupper( implode( ', ', $draft ) ) ) : '—';
}

/* ---------- Сайт: noindex для неготовой версии ---------- */

function sc_td_is_draft_view() {
	if ( ! is_singular() ) {
		return false;
	}
	$draft = (array) get_post_meta( get_queried_object_id(), SC_TD_META, true );
	return in_array( sc_td_current_lang(), $draft, true );
}

if ( function_exists( 'wp_robots' ) ) {
	add_filter( 'wp_robots', 'sc_td_robots', 99 );
} else {
	add_action( 'wp_head', 'sc_td_robots_legacy', 1 );
}
function sc_td_robots( $robots ) {
	if ( sc_td_is_draft_view() ) {
		unset( $robots['index'], $robots['max-image-preview'] );
		$robots['noindex'] = true;
		$robots['follow']  = true;
	}
	return $robots;
}
function sc_td_robots_legacy() {
	if ( sc_td_is_draft_view() ) {
		echo "<meta name='robots' content='noindex, follow'>\n";
	}
}
