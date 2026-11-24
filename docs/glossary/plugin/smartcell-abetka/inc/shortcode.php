<?php
/**
 * [sc_abetka] — тело страницы «Клітинна абетка» из карточек терминов.
 *
 * Разметка та же, что в ките (vm-glossary.html): обычный текст статьи без классов —
 *   <h2 id="letter-a">А</h2>
 *   <h3 id="якір">Термін</h3>
 *   <p><strong>Визначення:</strong> …</p>
 *   <p><strong>Простими словами:</strong> …</p>
 * H2 с id нужны оглавлению-«чипсам» (toc_view), H3 с id — ссылкам из статей.
 *
 * Если оглавление темы строится по сырому post_content (и шорткод ему не виден),
 * готовый HTML можно взять на странице настроек и вставить в редактор как есть.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_shortcode( 'sc_abetka', 'sc_abetka_shortcode' );
function sc_abetka_shortcode() {
	return sc_abetka_page_html();
}

/** Термины, сгруппированные по разделам (буквам) и отсортированные по украинскому алфавиту. */
function sc_abetka_groups( $lang = null ) {
	if ( null === $lang ) {
		$lang = sc_abetka_lang();
	}
	$groups = array();
	foreach ( sc_abetka_raw_terms() as $p ) {
		$m      = $p['meta'];
		$anchor = isset( $m['_sc_anchor'] ) ? $m['_sc_anchor'] : '';
		$letter = isset( $m['_sc_letter'] ) ? trim( $m['_sc_letter'] ) : '';
		if ( ! $anchor ) {
			continue;
		}
		$title_uk = sc_abetka_ml( $p['title'], 'uk', true );
		if ( '' === $letter ) {
			$letter = mb_strtoupper( mb_substr( $title_uk, 0, 1, 'UTF-8' ), 'UTF-8' );
		}
		// Разделы и порядок — по украинскому алфавиту на всех языках; тексты — на языке страницы,
		// перевода нет — украинский. Подпись «Визначення» / «Простими словами» — на языке показанного текста.
		$def    = sc_abetka_field( $m, 'definition' );
		$simple = sc_abetka_field( $m, 'simple' );
		$groups[ $letter ][] = array(
			'key'         => sc_abetka_sort_key( $title_uk ),
			'title'       => sc_abetka_ml( $p['title'], $lang, true ),
			'anchor'      => $anchor,
			'def'         => sc_abetka_ml( $def, $lang, true ),
			'def_lang'    => '' !== sc_abetka_ml( $def, $lang ) ? $lang : 'uk',
			'simple'      => sc_abetka_ml( $simple, $lang, true ),
			'simple_lang' => '' !== sc_abetka_ml( $simple, $lang ) ? $lang : 'uk',
		);
	}
	uksort( $groups, 'sc_abetka_cmp_letters' );
	foreach ( $groups as &$items ) {
		usort( $items, 'sc_abetka_cmp_key' );
	}
	unset( $items );
	return $groups;
}

function sc_abetka_page_html() {
	$html = '';
	foreach ( sc_abetka_groups() as $letter => $items ) {
		$label = sc_abetka_letter_label( $letter );
		$lang  = 'A–Z' === $label ? ' lang="en"' : '';
		$html .= '<h2 id="' . esc_attr( sc_abetka_letter_id( $letter ) ) . '"' . $lang . '>' . esc_html( $label ) . "</h2>\n";
		foreach ( $items as $t ) {
			$html .= '<h3 id="' . esc_attr( $t['anchor'] ) . '">' . esc_html( $t['title'] ) . "</h3>\n";
			if ( $t['def'] ) {
				$html .= '<p><strong>' . esc_html( sc_abetka_label( 'definition', $t['def_lang'] ) ) . '</strong> ' . sc_abetka_md( $t['def'] ) . "</p>\n";
			}
			if ( $t['simple'] ) {
				$html .= '<p><strong>' . esc_html( sc_abetka_label( 'simple', $t['simple_lang'] ) ) . '</strong> ' . sc_abetka_md( $t['simple'] ) . "</p>\n";
			}
		}
		$html .= "\n";
	}
	return $html;
}

/** Текст из таблицы клиники → HTML: экранирование, **жирный** (так в таблице выделены слова) → <strong>. */
function sc_abetka_md( $text ) {
	return preg_replace( '~\*\*(.+?)\*\*~u', '<strong>$1</strong>', esc_html( $text ) );
}

/**
 * Подписи абзацев. RU и EN — наш перевод, нужно вычитать (как переводы названий терминов);
 * поменять можно фильтром sc_abetka_label.
 */
function sc_abetka_label( $what, $lang ) {
	$labels = array(
		'definition' => array( 'uk' => 'Визначення:', 'ru' => 'Определение:', 'en' => 'Definition:' ),
		'simple'     => array( 'uk' => 'Простими словами:', 'ru' => 'Простыми словами:', 'en' => 'In simple terms:' ),
	);
	$label = isset( $labels[ $what ][ $lang ] ) ? $labels[ $what ][ $lang ] : $labels[ $what ]['uk'];
	return apply_filters( 'sc_abetka_label', $label, $what, $lang );
}

/* ---------- Оглавление-«чипсы» для сайдбара ---------- */

/**
 * Пункты оглавления страницы абетки: array( array( 'id' => 'letter-a', 'label' => 'А' ), … ).
 * Тема строит оглавление по H2 из post_content, а на странице абетки там только шорткод,
 * поэтому пункты берутся отсюда.
 */
function sc_abetka_toc_items() {
	$items = array();
	foreach ( array_keys( sc_abetka_groups() ) as $letter ) {
		$items[] = array(
			'id'    => sc_abetka_letter_id( $letter ),
			'label' => sc_abetka_letter_label( $letter ),
		);
	}
	return apply_filters( 'sc_abetka_toc_items', $items );
}

/** Подпись раздела: буква как есть; раздел английских терминов — «A–Z», как в ките (vm-glossary.html). */
function sc_abetka_letter_label( $letter ) {
	$letter = (string) $letter;
	return 1 === mb_strlen( $letter, 'UTF-8' ) ? $letter : 'A–Z';
}

/**
 * Готовые <li> для <ol class="vm-article__toc-list"> — разметка как в ките:
 *   <li><a class="sc-t-small" href="#letter-a">А</a></li>
 */
function sc_abetka_toc_html() {
	$html = '';
	foreach ( sc_abetka_toc_items() as $it ) {
		$lang  = 'A–Z' === $it['label'] ? ' lang="en"' : '';
		$html .= '<li><a class="sc-t-small" href="#' . esc_attr( $it['id'] ) . '"' . $lang . '>' . esc_html( $it['label'] ) . "</a></li>\n";
	}
	return $html;
}

/* ---------- Сортировка по украинскому алфавиту (без расширения intl) ---------- */

function sc_abetka_alphabet() {
	return 'абвгґдеєжзиіїйклмнопрстуфхцчшщьюя';
}

/** Строка → ключ сортировки: буква заменяется двузначным номером в алфавите. */
function sc_abetka_sort_key( $s ) {
	$abc = sc_abetka_alphabet();
	$s   = mb_strtolower( $s, 'UTF-8' );
	$key = '';
	$len = mb_strlen( $s, 'UTF-8' );
	for ( $i = 0; $i < $len; $i++ ) {
		$ch  = mb_substr( $s, $i, 1, 'UTF-8' );
		$pos = mb_strpos( $abc, $ch, 0, 'UTF-8' );
		if ( false !== $pos ) {
			$key .= sprintf( '~%02d', $pos ); // кириллица — после латиницы и цифр
		} elseif ( preg_match( '~[a-z0-9 ]~', $ch ) ) {
			$key .= $ch;
		}
	}
	return $key;
}

function sc_abetka_cmp_key( $a, $b ) {
	return strcmp( $a['key'], $b['key'] );
}

/** Разделы: буквы по алфавиту, всё остальное («Англійські терміни») — в конце. */
function sc_abetka_cmp_letters( $a, $b ) {
	$abc = sc_abetka_alphabet();
	$pa  = 1 === mb_strlen( $a, 'UTF-8' ) ? mb_strpos( $abc, mb_strtolower( $a, 'UTF-8' ), 0, 'UTF-8' ) : false;
	$pb  = 1 === mb_strlen( $b, 'UTF-8' ) ? mb_strpos( $abc, mb_strtolower( $b, 'UTF-8' ), 0, 'UTF-8' ) : false;
	$pa  = false === $pa ? 100 : $pa;
	$pb  = false === $pb ? 100 : $pb;
	return $pa === $pb ? strcmp( $a, $b ) : $pa - $pb;
}

/** id раздела, как в ките: letter-a, letter-b, letter-v, letter-h, letter-zh … */
function sc_abetka_letter_id( $letter ) {
	$map = array(
		'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'h', 'ґ' => 'g', 'д' => 'd', 'е' => 'e', 'є' => 'ye',
		'ж' => 'zh', 'з' => 'z', 'и' => 'y', 'і' => 'i', 'ї' => 'yi', 'й' => 'j', 'к' => 'k', 'л' => 'l',
		'м' => 'm', 'н' => 'n', 'о' => 'o', 'п' => 'p', 'р' => 'r', 'с' => 's', 'т' => 't', 'у' => 'u',
		'ф' => 'f', 'х' => 'kh', 'ц' => 'ts', 'ч' => 'ch', 'ш' => 'sh', 'щ' => 'shch', 'ю' => 'yu', 'я' => 'ya',
	);
	$l = mb_strtolower( $letter, 'UTF-8' );
	if ( isset( $map[ $l ] ) ) {
		return 'letter-' . $map[ $l ];
	}
	if ( preg_match( '~^[a-z0-9]$~', $l ) ) {
		return 'letter-' . $l;
	}
	return 'letter-latin'; // раздел английских терминов, как в ките: <h2 id="letter-latin" lang="en">A–Z</h2>
}
