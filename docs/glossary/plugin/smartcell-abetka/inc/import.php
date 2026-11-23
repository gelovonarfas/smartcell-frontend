<?php
/**
 * Импорт терминов из CSV (smartcell-abetka-terms.csv: UTF-8, запятая, формы через « | »).
 *
 * Карточка ищется по якорю (колонка anchor): есть — обновляется, нет — создаётся.
 * Термины, которых в файле нет, не удаляются. Поле «Посилання на сторінку послуги»
 * в CSV отсутствует и при импорте сохраняется как было.
 *
 * Запуск: кнопка на странице «Клітинна абетка → Налаштування та імпорт»
 * или WP-CLI: wp sc-abetka import [путь/к/файлу.csv]
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/** Колонка CSV → мета-ключ карточки. */
function sc_abetka_csv_map() {
	return array(
		'anchor'        => '_sc_anchor',
		'letter'        => '_sc_letter',
		'term_uk'       => '_sc_term_uk',
		'term_ru'       => '_sc_term_ru',
		'term_en'       => '_sc_term_en',
		'definition_uk' => '_sc_definition_uk',
		'simple_uk'     => '_sc_simple_uk',
		'autolink'      => '_sc_autolink',
		'forms_uk'      => '_sc_forms_uk',
		'forms_ru'      => '_sc_forms_ru',
		'forms_en'      => '_sc_forms_en',
	);
}

/**
 * @param string $file путь к CSV
 * @return array|WP_Error [created, updated, skipped]
 */
function sc_abetka_import_csv( $file ) {
	if ( ! is_readable( $file ) ) {
		return new WP_Error( 'sc_abetka_file', 'Файл не читається: ' . $file );
	}
	$fh = fopen( $file, 'r' );
	if ( ! $fh ) {
		return new WP_Error( 'sc_abetka_file', 'Не вдалося відкрити файл.' );
	}
	$head = fgetcsv( $fh, 0, ',', '"', '\\' );
	if ( ! $head ) {
		fclose( $fh );
		return new WP_Error( 'sc_abetka_csv', 'Порожній файл.' );
	}
	$head[0] = preg_replace( '~^\xEF\xBB\xBF~', '', $head[0] ); // BOM
	$head    = array_map( 'trim', $head );
	foreach ( array( 'anchor', 'title_uk', 'forms_uk' ) as $need ) {
		if ( ! in_array( $need, $head, true ) ) {
			fclose( $fh );
			return new WP_Error( 'sc_abetka_csv', 'У файлі немає колонки «' . $need . '». Потрібен smartcell-abetka-terms.csv.' );
		}
	}

	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 300 );
	}

	// Существующие карточки: якорь → ID (в любом статусе, кроме корзины)
	$existing = array();
	$ids      = get_posts(
		array(
			'post_type'        => 'sc_term',
			'post_status'      => array( 'publish', 'draft', 'pending', 'private' ),
			'numberposts'      => -1,
			'fields'           => 'ids',
			'suppress_filters' => true,
		)
	);
	foreach ( $ids as $id ) {
		$a = get_post_meta( $id, '_sc_anchor', true );
		if ( $a ) {
			$existing[ $a ] = $id;
		}
	}

	$map     = sc_abetka_csv_map();
	$created = 0;
	$updated = 0;
	$skipped = 0;
	while ( ( $row = fgetcsv( $fh, 0, ',', '"', '\\' ) ) !== false ) {
		if ( count( $row ) < count( $head ) ) {
			$row = array_pad( $row, count( $head ), '' );
		}
		$r      = array_combine( $head, array_slice( $row, 0, count( $head ) ) );
		$anchor = sanitize_title( $r['anchor'] );
		$title  = trim( $r['title_uk'] );
		if ( ! $anchor || '' === $title ) {
			$skipped++;
			continue;
		}
		$order = isset( $r['id'] ) ? (int) $r['id'] : 0;

		if ( isset( $existing[ $anchor ] ) ) {
			$post_id = $existing[ $anchor ];
			$post    = get_post( $post_id );
			if ( $post->post_title !== $title || (int) $post->menu_order !== $order ) {
				wp_update_post( array( 'ID' => $post_id, 'post_title' => wp_slash( $title ), 'menu_order' => $order ) );
			}
			$updated++;
		} else {
			$post_id = wp_insert_post(
				array(
					'post_type'   => 'sc_term',
					'post_status' => 'publish',
					'post_title'  => wp_slash( $title ),
					'post_name'   => $anchor,
					'menu_order'  => $order,
				),
				true
			);
			if ( is_wp_error( $post_id ) ) {
				$skipped++;
				continue;
			}
			$existing[ $anchor ] = $post_id;
			$created++;
		}

		foreach ( $map as $col => $key ) {
			if ( ! isset( $r[ $col ] ) ) {
				continue;
			}
			$val = trim( $r[ $col ] );
			if ( 'anchor' === $col ) {
				$val = $anchor;
			} elseif ( 'autolink' === $col ) {
				$val = '0' === $val ? '0' : '1';
			} elseif ( 0 === strpos( $col, 'forms_' ) ) {
				$val = implode( ' | ', sc_abetka_split_forms( $val ) );
			}
			update_post_meta( $post_id, $key, wp_slash( $val ) );
		}
	}
	fclose( $fh );
	sc_abetka_flush_index();

	return array( 'created' => $created, 'updated' => $updated, 'skipped' => $skipped );
}

/* ---------- Кнопка в админке ---------- */

add_action( 'admin_post_sc_abetka_import', 'sc_abetka_import_handle' );
function sc_abetka_import_handle() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Недостатньо прав.' );
	}
	check_admin_referer( 'sc_abetka_import' );

	$file = SC_ABETKA_CSV; // по умолчанию — файл из самого плагина
	if ( ! empty( $_FILES['sc_abetka_file']['tmp_name'] ) && is_uploaded_file( $_FILES['sc_abetka_file']['tmp_name'] ) ) {
		$file = $_FILES['sc_abetka_file']['tmp_name'];
	}
	$res = sc_abetka_import_csv( $file );
	if ( is_wp_error( $res ) ) {
		$msg = 'Помилка імпорту: ' . $res->get_error_message();
	} else {
		$msg = sprintf( 'Імпорт завершено: створено %d, оновлено %d, пропущено %d.', $res['created'], $res['updated'], $res['skipped'] );
	}
	set_transient( 'sc_abetka_notice', $msg, 60 );
	wp_safe_redirect( admin_url( 'edit.php?post_type=sc_term&page=sc-abetka' ) );
	exit;
}

/* ---------- WP-CLI ---------- */

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::add_command(
		'sc-abetka import',
		function ( $args ) {
			$res = sc_abetka_import_csv( isset( $args[0] ) ? $args[0] : SC_ABETKA_CSV );
			if ( is_wp_error( $res ) ) {
				WP_CLI::error( $res->get_error_message() );
			}
			WP_CLI::success( sprintf( 'створено %d, оновлено %d, пропущено %d', $res['created'], $res['updated'], $res['skipped'] ) );
		}
	);
}
