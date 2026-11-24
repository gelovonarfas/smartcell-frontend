<?php
/**
 * Языки карточек через qTranslate-X / qTranslate-XT.
 *
 * С версии 1.2.0 переводимые поля карточки хранятся одной строкой в формате qTranslate:
 *   [:ua]БАДи[:ru]БАДы[:en]Dietary supplements[:]
 * и в редакторе получают те же вкладки языков, что и статьи. Поля:
 *   заголовок (как в абетке, со скобками), _sc_term (назва без дужок), _sc_definition,
 *   _sc_simple, _sc_forms (форми слова, по одній у рядку).
 * Языковые коды внутри плагина — uk / ru / en; украинский у qTranslate часто «ua», приводим.
 *
 * Значение без меток qTranslate считает общим для всех языков — так же и здесь.
 * Карточки версий до 1.2.0 (поля _sc_term_uk, _sc_forms_ru…) читаются, пока их не перезапишет импорт.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Переводимые поля карточки (мета-ключи). */
function sc_abetka_ml_keys() {
	return array( '_sc_term', '_sc_definition', '_sc_simple', '_sc_forms' );
}

/** Код языка сайта для нашего кода: uk → ua, если qTranslate настроен на «ua». */
function sc_abetka_site_code( $lang ) {
	global $q_config;
	if ( 'uk' === $lang && ! empty( $q_config['enabled_languages'] ) && in_array( 'ua', (array) $q_config['enabled_languages'], true ) && ! in_array( 'uk', (array) $q_config['enabled_languages'], true ) ) {
		return 'ua';
	}
	return $lang;
}

/** Строка с метками → array( 'uk' => …, 'ru' => …, 'en' => … ). Без меток — одна строка для всех. */
function sc_abetka_ml_split( $raw ) {
	$raw = (string) $raw;
	$out = array();
	if ( ! preg_match( '#\[:[a-z]{2}\]|<!--:[a-z]{2}-->|\{:[a-z]{2}\}#i', $raw ) ) {
		$raw = trim( $raw );
		return '' === $raw ? array() : array( '*' => $raw );
	}
	$current = false;
	$blocks  = preg_split( '#(<!--:[a-z]{2}-->|<!--:-->|\[:[a-z]{2}\]|\[:\]|\{:[a-z]{2}\}|\{:\})#i', $raw, -1, PREG_SPLIT_NO_EMPTY | PREG_SPLIT_DELIM_CAPTURE );
	foreach ( $blocks as $b ) {
		if ( preg_match( '#^(?:<!--:([a-z]{2})-->|\[:([a-z]{2})\]|\{:([a-z]{2})\})$#i', $b, $m ) ) {
			$current = strtolower( $m[1] . ( isset( $m[2] ) ? $m[2] : '' ) . ( isset( $m[3] ) ? $m[3] : '' ) );
			if ( 'ua' === $current ) {
				$current = 'uk';
			}
			continue;
		}
		if ( in_array( $b, array( '[:]', '<!--:-->', '{:}' ), true ) ) {
			$current = false;
			continue;
		}
		if ( $current ) {
			$out[ $current ] = ( isset( $out[ $current ] ) ? $out[ $current ] : '' ) . $b;
		}
	}
	return array_filter( array_map( 'trim', $out ), 'strlen' );
}

/** array( 'uk' => …, 'ru' => … ) → [:ua]…[:ru]…[:] (коды языков сайта, пустые пропускаются). */
function sc_abetka_ml_join( $texts ) {
	$out = '';
	foreach ( array( 'uk', 'ru', 'en' ) as $l ) {
		if ( isset( $texts[ $l ] ) && '' !== trim( $texts[ $l ] ) ) {
			$out .= '[:' . sc_abetka_site_code( $l ) . ']' . trim( $texts[ $l ] );
		}
	}
	return '' === $out ? '' : $out . '[:]';
}

/**
 * Текст на языке $lang. $fallback = true — если перевода нет, украинский
 * (для страницы абетки); false — пусто (для подсказок: лучше без подсказки, чем на чужом языке).
 */
function sc_abetka_ml( $raw, $lang, $fallback = false ) {
	$parts = is_array( $raw ) ? $raw : sc_abetka_ml_split( $raw );
	if ( isset( $parts['*'] ) ) {
		return $parts['*'];
	}
	if ( isset( $parts[ $lang ] ) ) {
		return $parts[ $lang ];
	}
	return ( $fallback && isset( $parts['uk'] ) ) ? $parts['uk'] : '';
}

/**
 * Все опубликованные карточки «как в базе»: без фильтров qTranslate, которые на сайте
 * подменяют заголовки и мета-поля текущим языком. Один запрос на записи, один на мета.
 * @return array ID => array( 'title' => …, 'order' => …, 'meta' => array( key => value ) )
 */
function sc_abetka_raw_terms( $reset = false ) {
	static $cache = null;
	if ( null !== $cache && ! $reset ) {
		return $cache;
	}
	global $wpdb;
	$cache = array();
	$rows  = $wpdb->get_results( "SELECT ID, post_title, menu_order FROM {$wpdb->posts} WHERE post_type = 'sc_term' AND post_status = 'publish' ORDER BY ID ASC" );
	if ( ! $rows ) {
		return $cache;
	}
	foreach ( $rows as $r ) {
		$cache[ (int) $r->ID ] = array( 'title' => $r->post_title, 'order' => (int) $r->menu_order, 'meta' => array() );
	}
	$meta = $wpdb->get_results( "SELECT m.post_id, m.meta_key, m.meta_value FROM {$wpdb->postmeta} m INNER JOIN {$wpdb->posts} p ON p.ID = m.post_id WHERE p.post_type = 'sc_term' AND p.post_status = 'publish' AND m.meta_key LIKE '\\_sc\\_%'" );
	foreach ( $meta as $m ) {
		$id = (int) $m->post_id;
		if ( isset( $cache[ $id ] ) && ! isset( $cache[ $id ]['meta'][ $m->meta_key ] ) ) {
			$cache[ $id ]['meta'][ $m->meta_key ] = $m->meta_value;
		}
	}
	return $cache;
}

/** Мета-поля одной карточки «как в базе» (без фильтров qTranslate): key => value. */
function sc_abetka_raw_meta( $post_id ) {
	global $wpdb;
	$out = array();
	foreach ( $wpdb->get_results( $wpdb->prepare( "SELECT meta_key, meta_value FROM {$wpdb->postmeta} WHERE post_id = %d AND meta_key LIKE '\\_sc\\_%%' ORDER BY meta_id ASC", $post_id ) ) as $m ) {
		if ( ! isset( $out[ $m->meta_key ] ) ) {
			$out[ $m->meta_key ] = $m->meta_value;
		}
	}
	return $out;
}

/**
 * Переводимое поле карточки на всех языках: array( 'uk' => …, … ) или array( '*' => … ).
 * Для карточек до 1.2.0 собирается из старых полей _sc_term_uk / _ru / _en.
 * $name — term | definition | simple | forms.
 */
function sc_abetka_field( $meta, $name ) {
	$key = '_sc_' . $name;
	if ( isset( $meta[ $key ] ) && '' !== trim( $meta[ $key ] ) ) {
		return sc_abetka_ml_split( $meta[ $key ] );
	}
	$old = array();
	foreach ( array( 'uk', 'ru', 'en' ) as $l ) {
		if ( isset( $meta[ $key . '_' . $l ] ) && '' !== trim( $meta[ $key . '_' . $l ] ) ) {
			$old[ $l ] = trim( $meta[ $key . '_' . $l ] );
		}
	}
	return $old;
}

/* ---------- Вкладки языков в карточке ---------- */

/**
 * Сообщаем qTranslate-X / XT, что поля карточки переводимые: над ними появятся
 * те же переключатели языков, что у заголовка и текста статьи.
 */
add_filter( 'i18n_admin_config', 'sc_abetka_qtx_admin_config' );
function sc_abetka_qtx_admin_config( $config ) {
	$fields = array();
	foreach ( sc_abetka_ml_keys() as $key ) {
		$fields[ $key ] = array();
	}
	$config['sc-abetka-term'] = array(
		'post_type' => 'sc_term', // qTranslate-X превращает строку в регулярное выражение
		'pages'     => array( 'post.php' => '', 'post-new.php' => '' ),
		'forms'     => array( 'post' => array( 'fields' => $fields ) ),
	);
	return $config;
}
