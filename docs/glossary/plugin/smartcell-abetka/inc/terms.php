<?php
/**
 * Тип записи «Термін» и кеш индекса форм.
 *
 * Карточка термина = запись sc_term: заголовок — термин как в абетке (со скобками),
 * остальное в мета-полях. На сайте у карточек нет собственных страниц:
 * их выводит шорткод [sc_abetka] и использует фильтр автоссылок.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Поля карточки: ключ мета → [подпись, вид поля, пояснение]. */
function sc_abetka_fields() {
	return array(
		'_sc_anchor'        => array( 'HTML-якір', 'text', 'Латиницею, без пробілів. Після запуску не змінювати: зламаються посилання зі статей.' ),
		'_sc_letter'        => array( 'Літера (розділ абетки)', 'text', '' ),
		'_sc_term_uk'       => array( 'Назва без дужок — UA', 'text', 'Показується в заголовку підказки.' ),
		'_sc_term_ru'       => array( 'Назва без дужок — RU', 'text', '' ),
		'_sc_term_en'       => array( 'Назва без дужок — EN', 'text', '' ),
		'_sc_definition_uk' => array( 'Визначення', 'textarea', '' ),
		'_sc_simple_uk'     => array( 'Простими словами', 'textarea', 'Цей текст іде в підказку; якщо порожньо — береться визначення.' ),
		'_sc_forms_uk'      => array( 'Форми слова — UA', 'forms', 'По одній у рядку: відмінки, множина, синоніми. За ними термін шукається в тексті.' ),
		'_sc_forms_ru'      => array( 'Форми слова — RU', 'forms', '' ),
		'_sc_forms_en'      => array( 'Форми слова — EN', 'forms', '' ),
		'_sc_service_url'   => array( 'Посилання на сторінку послуги', 'url', 'Якщо заповнено — у статтях термін веде сюди, а не в абетку, і без підказки (для напрямів і послуг клініки).' ),
	);
}

add_action( 'init', 'sc_abetka_register_cpt' );
function sc_abetka_register_cpt() {
	register_post_type(
		'sc_term',
		array(
			'labels'              => array(
				'name'          => 'Клітинна абетка',
				'singular_name' => 'Термін',
				'add_new'       => 'Додати термін',
				'add_new_item'  => 'Новий термін',
				'edit_item'     => 'Редагувати термін',
				'search_items'  => 'Шукати термін',
				'not_found'     => 'Термінів немає',
				'all_items'     => 'Усі терміни',
				'menu_name'     => 'Клітинна абетка',
			),
			'public'              => false,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'show_in_nav_menus'   => false,
			'exclude_from_search' => true,
			'publicly_queryable'  => false,
			'has_archive'         => false,
			'rewrite'             => false,
			'menu_icon'           => 'dashicons-book-alt',
			'menu_position'       => 26,
			'supports'            => array( 'title' ),
		)
	);
}

/* ---------- Карточка в админке ---------- */

add_action( 'add_meta_boxes_sc_term', 'sc_abetka_term_metabox' );
function sc_abetka_term_metabox() {
	add_meta_box( 'sc_abetka_term', 'Картка терміна', 'sc_abetka_term_metabox_html', 'sc_term', 'normal', 'high' );
}

function sc_abetka_term_metabox_html( $post ) {
	wp_nonce_field( 'sc_abetka_term', 'sc_abetka_term_nonce' );
	$autolink = get_post_meta( $post->ID, '_sc_autolink', true );
	if ( '' === $autolink ) {
		$autolink = '1';
	}
	echo '<p><label><input type="checkbox" name="_sc_autolink" value="1"' . checked( $autolink, '1', false ) . '> <strong>Підсвічувати в статтях</strong> (автопосилання на абетку)</label><br>';
	echo '<span class="description">Зніміть для частотних і побутових слів: термін лишається в абетці, але в текстах не підсвічується.</span></p>';
	echo '<table class="form-table" role="presentation"><tbody>';
	foreach ( sc_abetka_fields() as $key => $f ) {
		$val = get_post_meta( $post->ID, $key, true );
		echo '<tr><th scope="row"><label for="' . esc_attr( $key ) . '">' . esc_html( $f[0] ) . '</label></th><td>';
		if ( 'textarea' === $f[1] ) {
			echo '<textarea class="large-text" rows="3" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '">' . esc_textarea( $val ) . '</textarea>';
		} elseif ( 'forms' === $f[1] ) {
			$lines = implode( "\n", sc_abetka_split_forms( $val ) );
			echo '<textarea class="large-text" rows="5" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '">' . esc_textarea( $lines ) . '</textarea>';
		} else {
			echo '<input class="large-text" type="' . ( 'url' === $f[1] ? 'url' : 'text' ) . '" id="' . esc_attr( $key ) . '" name="' . esc_attr( $key ) . '" value="' . esc_attr( $val ) . '">';
		}
		if ( $f[2] ) {
			echo '<p class="description">' . esc_html( $f[2] ) . '</p>';
		}
		echo '</td></tr>';
	}
	echo '</tbody></table>';
}

add_action( 'save_post_sc_term', 'sc_abetka_term_save', 10, 2 );
function sc_abetka_term_save( $post_id, $post ) {
	sc_abetka_flush_index();
	if ( ! isset( $_POST['sc_abetka_term_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['sc_abetka_term_nonce'] ), 'sc_abetka_term' ) ) {
		return; // не из формы карточки (импорт, быстрая правка) — поля не трогаем
	}
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	foreach ( sc_abetka_fields() as $key => $f ) {
		$raw = isset( $_POST[ $key ] ) ? wp_unslash( $_POST[ $key ] ) : '';
		if ( 'textarea' === $f[1] ) {
			$val = sanitize_textarea_field( $raw );
		} elseif ( 'forms' === $f[1] ) {
			$val = implode( ' | ', sc_abetka_split_forms( sanitize_textarea_field( $raw ) ) );
		} elseif ( 'url' === $f[1] ) {
			$val = esc_url_raw( trim( $raw ) );
		} else {
			$val = sanitize_text_field( $raw );
		}
		if ( '_sc_anchor' === $key ) {
			$val = sanitize_title( $val );
		}
		update_post_meta( $post_id, $key, $val );
	}
	update_post_meta( $post_id, '_sc_autolink', isset( $_POST['_sc_autolink'] ) ? '1' : '0' );
}

// Удаление и корзина тоже меняют набор терминов
add_action( 'trashed_post', 'sc_abetka_flush_index' );
add_action( 'untrashed_post', 'sc_abetka_flush_index' );
add_action( 'deleted_post', 'sc_abetka_flush_index' );

/* Колонки в списке терминов: видно, что подсвечивается и куда ведёт */
add_filter( 'manage_sc_term_posts_columns', 'sc_abetka_columns' );
function sc_abetka_columns( $cols ) {
	$out = array();
	foreach ( $cols as $k => $v ) {
		if ( 'date' === $k ) {
			$out['sc_letter']   = 'Літера';
			$out['sc_autolink'] = 'У статтях';
		}
		$out[ $k ] = $v;
	}
	return $out;
}

add_action( 'manage_sc_term_posts_custom_column', 'sc_abetka_column_html', 10, 2 );
function sc_abetka_column_html( $col, $post_id ) {
	if ( 'sc_letter' === $col ) {
		echo esc_html( get_post_meta( $post_id, '_sc_letter', true ) );
	} elseif ( 'sc_autolink' === $col ) {
		if ( get_post_meta( $post_id, '_sc_service_url', true ) ) {
			echo 'посилання на послугу';
		} elseif ( '0' === get_post_meta( $post_id, '_sc_autolink', true ) ) {
			echo '—';
		} else {
			echo 'підсвічується';
		}
	}
}

/* ---------- Формы и индекс ---------- */

/** «форма | форма» или построчно → чистый массив без пустых и повторов. */
function sc_abetka_split_forms( $raw ) {
	$parts = preg_split( '~\s*(?:\||\R)\s*~u', (string) $raw );
	$out   = array();
	foreach ( $parts as $p ) {
		$p = trim( $p );
		if ( '' !== $p && ! in_array( $p, $out, true ) ) {
			$out[] = $p;
		}
	}
	return $out;
}

/** Слова текста: буквы и цифры, внутри слова допустимы апостроф и дефис («м’язова», «RF-терапія»). */
function sc_abetka_word_regex() {
	return '~[\p{L}\p{N}]+(?:[\'’ʼ‘`\-‑][\p{L}\p{N}]+)*~u';
}

/** Слово в виде для сравнения: нижний регистр, один вид апострофа и дефиса. */
function sc_abetka_norm( $word ) {
	$word = str_replace( array( "'", 'ʼ', '‘', '`' ), '’', $word );
	$word = str_replace( '‑', '-', $word );
	return mb_strtolower( $word, 'UTF-8' );
}

/** То же, но регистр сохраняется — для аббревиатур. */
function sc_abetka_norm_cs( $word ) {
	$word = str_replace( array( "'", 'ʼ', '‘', '`' ), '’', $word );
	return str_replace( '‑', '-', $word );
}

function sc_abetka_flush_index() {
	foreach ( array( 'uk', 'ru', 'en' ) as $lang ) {
		delete_option( 'sc_abetka_idx_' . $lang );
	}
}

/**
 * Индекс для поиска терминов в тексте на языке $lang.
 * 'terms' — данные для ссылки и подсказки; 'first' — формы, сгруппированные по первому слову
 * и отсортированные от длинных к коротким («клітинна регенерація» раньше, чем «регенерація»).
 * Собирается один раз и лежит в опции; сбрасывается при любой правке терминов.
 */
function sc_abetka_index( $lang ) {
	if ( ! in_array( $lang, array( 'uk', 'ru', 'en' ), true ) ) {
		return array( 'terms' => array(), 'first' => array() );
	}
	$cached = get_option( 'sc_abetka_idx_' . $lang );
	if ( is_array( $cached ) && isset( $cached['v'] ) && SC_ABETKA_VER === $cached['v'] ) {
		return $cached;
	}

	$posts = get_posts(
		array(
			'post_type'        => 'sc_term',
			'post_status'      => 'publish',
			'numberposts'      => -1,
			'orderby'          => 'ID',
			'order'            => 'ASC',
			'suppress_filters' => true,
		)
	);

	$terms = array();
	$first = array();
	foreach ( $posts as $p ) {
		$anchor  = get_post_meta( $p->ID, '_sc_anchor', true );
		$service = get_post_meta( $p->ID, '_sc_service_url', true );
		$auto    = '0' !== get_post_meta( $p->ID, '_sc_autolink', true );
		if ( ! $anchor || ( ! $auto && ! $service ) ) {
			continue;
		}
		$name = get_post_meta( $p->ID, '_sc_term_' . $lang, true );
		$tip  = '';
		if ( 'uk' === $lang ) { // определения есть только на украинском
			$tip = get_post_meta( $p->ID, '_sc_simple_uk', true );
			if ( ! $tip ) {
				$tip = get_post_meta( $p->ID, '_sc_definition_uk', true );
			}
		}
		$terms[ $anchor ] = array(
			'name'    => $name ? $name : $p->post_title,
			'tip'     => $tip,
			'service' => $service,
		);

		foreach ( sc_abetka_split_forms( get_post_meta( $p->ID, '_sc_forms_' . $lang, true ) ) as $form ) {
			if ( ! preg_match_all( sc_abetka_word_regex(), $form, $m ) ) {
				continue;
			}
			$words = array_map( 'sc_abetka_norm', $m[0] );
			// Аббревиатуры (PRP, HIFU, БАДи, RF-терапія) сравниваются с учётом регистра
			$cs = preg_match( '~\p{Lu}{2}~u', $form ) ? array_map( 'sc_abetka_norm_cs', $m[0] ) : null;
			$first[ $words[0] ][] = array( $words, $anchor, $cs );
		}
	}
	foreach ( $first as $w => $list ) {
		usort( $list, 'sc_abetka_cmp_len' );
		$first[ $w ] = $list;
	}

	$index = array( 'v' => SC_ABETKA_VER, 'terms' => $terms, 'first' => $first );
	update_option( 'sc_abetka_idx_' . $lang, $index, false );
	return $index;
}

function sc_abetka_cmp_len( $a, $b ) {
	return count( $b[0] ) - count( $a[0] );
}
