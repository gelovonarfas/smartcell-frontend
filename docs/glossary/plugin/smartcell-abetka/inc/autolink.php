<?php
/**
 * Автоссылки на «Клітинну абетку» в тексте статьи (фильтр the_content).
 *
 * Правила (согласованы с редакцией, см. docs/glossary/README.md в ките):
 *  1. ссылка только на первое упоминание термина, всего не больше N на статью (настройка, 7);
 *  2. не трогаем заголовки, готовые ссылки, цитаты, figure, aside и всё внутри class="sc-no-terms";
 *  3. длинные формы раньше коротких; совпадение по целым словам, без учёта регистра
 *     (аббревиатуры — с учётом); три вида апострофа считаются одним;
 *  4. формы берутся по языку текущей версии (qTranslate);
 *  5. у термина с «посиланням на сторінку послуги» ссылка ведёт на услугу, без подсказки.
 *
 * Разметка та же, что на стенде (preview-abetka-tooltips.html):
 *   <a class="sc-term" href="…/abetka#якір" aria-describedby="sc-term-якір">слово</a>
 *   … в конце текста: <span class="sc-term-tip" id="sc-term-якір" role="tooltip" hidden>…</span>
 * Показывает подсказки assets/term-tip.js. Без JS остаётся обычная ссылка.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Работает ли фильтр для текущего запроса. Тот же ответ нужен и для подключения CSS/JS. */
function sc_abetka_is_active() {
	static $memo = null;
	if ( null !== $memo ) {
		return $memo;
	}
	$memo = false;
	$o    = sc_abetka_options();
	if ( is_admin() || is_feed() ) {
		return false;
	}
	if ( 'off' === $o['mode'] ) {
		return sc_abetka_why( 'режим «Вимкнено»' );
	}
	$types = array_filter( array_map( 'trim', explode( ',', $o['post_types'] ) ) );
	if ( ! $types || ! is_singular( $types ) ) {
		$obj = get_queried_object();
		return sc_abetka_why( 'тип запису «' . ( $obj && isset( $obj->post_type ) ? $obj->post_type : 'не запис' ) . '» не в налаштуваннях (зараз: ' . $o['post_types'] . ')' );
	}
	$post_id = get_queried_object_id();
	if ( 'test' === $o['mode'] ) {
		$ids = array_map( 'intval', array_filter( array_map( 'trim', explode( ',', $o['test_ids'] ) ) ) );
		if ( ! in_array( (int) $post_id, $ids, true ) ) {
			return sc_abetka_why( 'режим «Тест», а ID ' . $post_id . ' немає в переліку (' . $o['test_ids'] . ')' );
		}
	}
	if ( get_post_meta( $post_id, '_sc_abetka_off', true ) ) {
		return sc_abetka_why( 'у статті стоїть галочка «Без автопосилань»' );
	}
	$post = get_post( $post_id );
	if ( $post && has_shortcode( $post->post_content, 'sc_abetka' ) ) {
		return sc_abetka_why( 'це сама сторінка абетки' );
	}
	if ( ! in_array( sc_abetka_lang(), (array) $o['langs'], true ) ) {
		return sc_abetka_why( 'мова «' . sc_abetka_lang() . '» не увімкнена в налаштуваннях' );
	}
	$memo = (bool) apply_filters( 'sc_abetka_is_active', true, $post_id );
	if ( $memo && ! $o['abetka_url'] ) {
		sc_abetka_why( 'не вказано адресу сторінки абетки, посилань не буде' );
	} elseif ( $memo ) {
		sc_abetka_why( 'працює, ID ' . $post_id . ', мова ' . sc_abetka_lang() );
	}
	return $memo;
}

/**
 * Почему фильтр работает или нет — для админа HTML-комментарием внизу страницы
 * (<!-- sc-abetka: … -->). Посетители его не видят. Запоминает причину и возвращает false.
 */
function sc_abetka_why( $reason = null ) {
	static $why = '';
	if ( null !== $reason ) {
		$why = $reason;
	}
	return null === $reason ? $why : false;
}

add_action( 'wp_footer', 'sc_abetka_debug_comment', 999 );
function sc_abetka_debug_comment() {
	if ( ! is_singular() || ! current_user_can( 'manage_options' ) ) {
		return;
	}
	sc_abetka_is_active();
	$stats = sc_abetka_stats();
	echo "\n<!-- sc-abetka " . esc_html( SC_ABETKA_VER ) . ': ' . esc_html( sc_abetka_why() ) . ( $stats ? '; ' . esc_html( $stats ) : '' ) . " -->\n";
}

/** Сколько ссылок поставил фильтр на этой странице. */
function sc_abetka_stats( $add = null ) {
	static $s = '';
	if ( null !== $add ) {
		$s = $add;
	}
	return $s;
}

/** Адрес страницы абетки для текущего языка, без якоря. */
function sc_abetka_page_url() {
	$o   = sc_abetka_options();
	$url = trim( $o['abetka_url'] );
	if ( $url && function_exists( 'qtranxf_convertURL' ) ) {
		$url = qtranxf_convertURL( $url );
	}
	return $url;
}

/**
 * Автоссылки в HTML текста статьи. Вызывается в шаблоне статьи только для тела текста —
 * так лид в шапке, «Коротко» и прочие поля остаются без ссылок:
 *   echo sc_abetka_apply( apply_filters( 'the_content', get_the_content() ) );
 * Проверки режима, языка, типа записи, «Тест» по ID — внутри; не та страница — HTML как был.
 */
function sc_abetka_apply( $html ) {
	if ( ! sc_abetka_is_active() ) {
		return $html;
	}
	$o     = sc_abetka_options();
	$lang  = sc_abetka_lang();
	$index = sc_abetka_index( $lang );
	$state = &sc_abetka_page_state();
	$out   = sc_abetka_autolink( $html, $index, sc_abetka_page_url(), (int) $o['max_links'], ! empty( $o['tooltips'] ), $state );
	$state['calls']++;
	sc_abetka_stats( 'термінів у індексі ' . count( $index['terms'] ) . ', посилань на сторінці ' . count( $state['used'] ) . ', викликів ' . $state['calls'] );
	if ( $state['tips'] && ! empty( $o['assets'] ) ) {
		sc_abetka_enqueue_assets(); // на случай, если тема вызвала функцию уже после wp_head
	}
	return $out;
}

/**
 * Общий учёт на всю страницу: тема может вызывать sc_abetka_apply() на каждый блок текста,
 * а правила «только первое упоминание» и «не больше N ссылок» действуют на статью целиком.
 * Подсказки копятся здесь и выводятся один раз внизу страницы (sc_abetka_print_tips).
 */
function &sc_abetka_page_state() {
	static $state = array( 'used' => array(), 'tips' => '', 'calls' => 0, 'printed' => false );
	return $state;
}

add_action( 'wp_footer', 'sc_abetka_print_tips', 5 );
function sc_abetka_print_tips() {
	$state = &sc_abetka_page_state();
	if ( $state['tips'] && ! $state['printed'] ) {
		echo "\n<!-- Підказки до термінів «Клітинної абетки» -->\n<div class=\"sc-term-tips\">\n" . $state['tips'] . "</div>\n"; // phpcs:ignore WordPress.Security.EscapeOutput -- собрано из экранированных частей
		$state['printed'] = true;
	}
}

/**
 * Автоматически через the_content — только если включено в настройках («Підставляти автоматично»).
 * По умолчанию выключено: тема вызывает sc_abetka_apply() сама. Приоритет 20 — после wpautop (10),
 * шорткодов (11) и после того, как qTranslate оставил один язык.
 */
add_action( 'init', 'sc_abetka_maybe_hook_content' );
function sc_abetka_maybe_hook_content() {
	$o = sc_abetka_options();
	if ( ! empty( $o['auto'] ) ) {
		add_filter( 'the_content', 'sc_abetka_filter_content', 20 );
	}
}

function sc_abetka_filter_content( $content ) {
	if ( get_the_ID() !== get_queried_object_id() ) {
		return $content; // только основной текст открытой статьи, не карточки «Читайте також»
	}
	return sc_abetka_apply( $content );
}

/**
 * Чистая функция: HTML → HTML со ссылками. Вынесена отдельно, чтобы её можно было
 * вызвать и на других полях (например, если текст статьи выводится не через the_content).
 */
function sc_abetka_autolink( $html, $index, $page_url, $max, $tooltips = true, &$state = null ) {
	if ( '' === trim( $html ) || empty( $index['first'] ) || $max < 1 ) {
		return $html;
	}
	$parts = wp_html_split( $html );
	$skip  = array( 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'figure', 'aside', 'script', 'style', 'code', 'pre', 'button', 'textarea', 'select', 'svg', 'nav', 'iframe' );
	$void  = array( 'br', 'img', 'hr', 'input', 'source', 'wbr', 'col', 'embed', 'track', 'area', 'meta', 'link' );

	$used  = is_array( $state ) ? $state['used'] : array(); // якорь => true: термин уже получил ссылку
	$tips  = '';
	$inTag = '';      // тег, внутри которого сейчас ничего не трогаем
	$depth = 0;

	foreach ( $parts as $i => $part ) {
		if ( '' === $part ) {
			continue;
		}
		if ( '<' === $part[0] ) {
			if ( ! preg_match( '~^<(/?)([a-zA-Z][a-zA-Z0-9]*)~', $part, $m ) ) {
				continue; // комментарий, <!DOCTYPE и т. п.
			}
			$name    = strtolower( $m[2] );
			$closing = '/' === $m[1];
			if ( $inTag ) {
				if ( $name === $inTag ) {
					$depth += $closing ? -1 : ( '/>' === substr( $part, -2 ) ? 0 : 1 );
					if ( $depth < 1 ) {
						$inTag = '';
					}
				}
			} elseif ( ! $closing && ! in_array( $name, $void, true ) && '/>' !== substr( $part, -2 ) ) {
				if ( in_array( $name, $skip, true ) || preg_match( '~\sclass\s*=\s*["\'][^"\']*\bsc-no-terms\b~i', $part ) ) {
					$inTag = $name;
					$depth = 1;
				}
			}
			continue;
		}
		if ( $inTag || count( $used ) >= $max ) {
			continue;
		}
		$parts[ $i ] = sc_abetka_link_text( $part, $index, $page_url, $max, $tooltips, $used, $tips );
	}

	$html = implode( '', $parts );
	if ( is_array( $state ) ) {
		$state['used']  = $used;
		$state['tips'] .= $tips; // выведет sc_abetka_print_tips() в wp_footer
		return $html;
	}
	if ( $tips ) {
		$html .= "\n<!-- Підказки до термінів «Клітинної абетки» -->\n" . $tips;
	}
	return $html;
}

/** Один текстовый узел: ищет термины и оборачивает первое упоминание каждого. */
function sc_abetka_link_text( $text, $index, $page_url, $max, $tooltips, &$used, &$tips ) {
	// wptexturize к этому моменту превратил апострофы и неразрывные пробелы в сущности
	$text = str_replace(
		array( '&#8217;', '&rsquo;', '&#039;', '&#39;', '&apos;', '&nbsp;', '&#160;' ),
		array( '’', '’', "'", "'", "'", "\xC2\xA0", "\xC2\xA0" ),
		$text
	);
	if ( ! preg_match_all( sc_abetka_word_regex(), $text, $m, PREG_OFFSET_CAPTURE ) ) {
		return $text;
	}
	$words = $m[0]; // [слово, байтовое смещение]
	$n     = count( $words );
	$norm  = array();
	foreach ( $words as $w ) {
		$norm[] = sc_abetka_norm( $w[0] );
	}

	$out = '';
	$pos = 0;
	for ( $i = 0; $i < $n; $i++ ) {
		if ( ! isset( $index['first'][ $norm[ $i ] ] ) ) {
			continue;
		}
		foreach ( $index['first'][ $norm[ $i ] ] as $form ) {
			list( $fw, $anchor, $cs ) = $form;
			$len = count( $fw );
			if ( $i + $len > $n ) {
				continue;
			}
			$ok = true;
			for ( $k = 0; $k < $len; $k++ ) {
				if ( $norm[ $i + $k ] !== $fw[ $k ] || ( $cs && sc_abetka_norm_cs( $words[ $i + $k ][0] ) !== $cs[ $k ] ) ) {
					$ok = false;
					break;
				}
				if ( $k > 0 ) { // между словами формы — только пробел (допустима запятая перед ним)
					$prev_end = $words[ $i + $k - 1 ][1] + strlen( $words[ $i + $k - 1 ][0] );
					$gap      = substr( $text, $prev_end, $words[ $i + $k ][1] - $prev_end );
					if ( ! preg_match( '~^,?[\s\x{00A0}]+$~u', $gap ) ) {
						$ok = false;
						break;
					}
				}
			}
			if ( ! $ok ) {
				continue;
			}

			// Самая длинная форма с этого слова найдена. Второе упоминание пропускаем целиком,
			// чтобы внутри него не сработал более короткий термин.
			$start = $words[ $i ][1];
			$last  = $words[ $i + $len - 1 ];
			$end   = $last[1] + strlen( $last[0] );
			$term  = isset( $index['terms'][ $anchor ] ) ? $index['terms'][ $anchor ] : null;
			$href  = '';
			if ( $term && ! isset( $used[ $anchor ] ) && count( $used ) < $max ) {
				$href = $term['service'] ? $term['service'] : ( $page_url ? $page_url . '#' . $anchor : '' );
			}
			if ( $href ) {
				$label = substr( $text, $start, $end - $start );
				$out  .= substr( $text, $pos, $start - $pos );
				if ( $term['service'] ) {
					$out .= '<a href="' . esc_url( $href ) . '">' . $label . '</a>';
				} elseif ( $tooltips && $term['tip'] ) {
					$out  .= '<a class="sc-term" href="' . esc_url( $href ) . '" aria-describedby="sc-term-' . esc_attr( $anchor ) . '">' . $label . '</a>';
					$tips .= sc_abetka_tip_html( $anchor, $term, $href ) . "\n";
				} else {
					$out .= '<a class="sc-term" href="' . esc_url( $href ) . '">' . $label . '</a>';
				}
				$pos             = $end;
				$used[ $anchor ] = true;
			}
			$i += $len - 1;
			break;
		}
	}
	return $out . substr( $text, $pos );
}

/** Подсказка: название, «простими словами», строка со ссылкой на абетку. */
function sc_abetka_tip_html( $anchor, $term, $href ) {
	// RU и EN — наш перевод, нужно вычитать; поменять — фильтр sc_abetka_tip_more
	$texts = array(
		'uk' => 'Натисніть на слово, щоб відкрити в <a href="%s" tabindex="-1">«Клітинній абетці»</a>',
		'ru' => 'Нажмите на слово, чтобы открыть в <a href="%s" tabindex="-1">«Клеточной азбуке»</a>',
		'en' => 'Click the word to open it in the <a href="%s" tabindex="-1">Cell Glossary</a>',
	);
	$lang = sc_abetka_lang();
	$more = apply_filters( 'sc_abetka_tip_more', isset( $texts[ $lang ] ) ? $texts[ $lang ] : $texts['uk'], $lang );
	return '<span class="sc-term-tip" id="sc-term-' . esc_attr( $anchor ) . '" role="tooltip" hidden>'
		. '<span class="sc-term-tip__title">' . esc_html( $term['name'] ) . '</span>'
		. esc_html( $term['tip'] )
		. '<span class="sc-term-tip__more">' . sprintf( $more, esc_url( $href ) ) . '</span>'
		. '</span>';
}

/* CSS и JS подсказок — только на страницах, где фильтр работает */
add_action( 'wp_enqueue_scripts', 'sc_abetka_assets', 20 );
function sc_abetka_assets() {
	$o = sc_abetka_options();
	if ( empty( $o['assets'] ) || ! sc_abetka_is_active() ) {
		return;
	}
	sc_abetka_enqueue_assets();
}

function sc_abetka_enqueue_assets() {
	wp_enqueue_style( 'sc-term-tip', SC_ABETKA_URL . 'assets/term-tip.css', array(), SC_ABETKA_VER );
	wp_enqueue_script( 'sc-term-tip', SC_ABETKA_URL . 'assets/term-tip.js', array(), SC_ABETKA_VER, true );
}
