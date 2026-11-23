<?php
/**
 * Страница «Клітинна абетка → Налаштування та імпорт» и галочка «без автопосилань» у статьи.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action( 'admin_menu', 'sc_abetka_menu' );
function sc_abetka_menu() {
	add_submenu_page( 'edit.php?post_type=sc_term', 'Клітинна абетка: налаштування та імпорт', 'Налаштування та імпорт', 'manage_options', 'sc-abetka', 'sc_abetka_settings_html' );
}

add_action( 'admin_post_sc_abetka_save', 'sc_abetka_settings_save' );
function sc_abetka_settings_save() {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( 'Недостатньо прав.' );
	}
	check_admin_referer( 'sc_abetka_save' );
	$in    = isset( $_POST['sc'] ) && is_array( $_POST['sc'] ) ? wp_unslash( $_POST['sc'] ) : array();
	$mode  = isset( $in['mode'] ) && in_array( $in['mode'], array( 'off', 'test', 'on' ), true ) ? $in['mode'] : 'off';
	$langs = array();
	foreach ( array( 'uk', 'ru', 'en' ) as $l ) {
		if ( ! empty( $in['langs'][ $l ] ) ) {
			$langs[] = $l;
		}
	}
	update_option(
		'sc_abetka',
		array(
			'mode'       => $mode,
			'test_ids'   => implode( ', ', array_filter( array_map( 'absint', explode( ',', isset( $in['test_ids'] ) ? $in['test_ids'] : '' ) ) ) ),
			'post_types' => implode( ', ', array_filter( array_map( 'sanitize_key', explode( ',', isset( $in['post_types'] ) ? $in['post_types'] : 'post' ) ) ) ),
			'abetka_url' => esc_url_raw( trim( preg_replace( '~#.*$~', '', isset( $in['abetka_url'] ) ? $in['abetka_url'] : '' ) ) ),
			'max_links'  => max( 1, min( 30, isset( $in['max_links'] ) ? absint( $in['max_links'] ) : 7 ) ),
			'langs'      => $langs,
			'tooltips'   => empty( $in['tooltips'] ) ? 0 : 1,
			'assets'     => empty( $in['assets'] ) ? 0 : 1,
		)
	);
	set_transient( 'sc_abetka_notice', 'Налаштування збережено.', 60 );
	wp_safe_redirect( admin_url( 'edit.php?post_type=sc_term&page=sc-abetka' ) );
	exit;
}

function sc_abetka_settings_html() {
	$o      = sc_abetka_options();
	$count  = wp_count_posts( 'sc_term' );
	$total  = isset( $count->publish ) ? (int) $count->publish : 0;
	$notice = get_transient( 'sc_abetka_notice' );
	if ( $notice ) {
		delete_transient( 'sc_abetka_notice' );
	}
	$action = esc_url( admin_url( 'admin-post.php' ) );
	?>
	<div class="wrap">
		<h1>Клітинна абетка: налаштування та імпорт</h1>
		<?php if ( $notice ) : ?>
			<div class="notice notice-success is-dismissible"><p><?php echo esc_html( $notice ); ?></p></div>
		<?php endif; ?>
		<?php if ( 'off' !== $o['mode'] && ! $o['abetka_url'] ) : ?>
			<div class="notice notice-warning"><p>Не вказано адресу сторінки абетки — посилання на терміни не ставляться.</p></div>
		<?php endif; ?>

		<h2>Автопосилання в статтях</h2>
		<form method="post" action="<?php echo $action; ?>">
			<input type="hidden" name="action" value="sc_abetka_save">
			<?php wp_nonce_field( 'sc_abetka_save' ); ?>
			<table class="form-table" role="presentation"><tbody>
				<tr>
					<th scope="row">Режим</th>
					<td>
						<fieldset>
							<label><input type="radio" name="sc[mode]" value="off" <?php checked( $o['mode'], 'off' ); ?>> Вимкнено — на сайті нічого не змінюється</label><br>
							<label><input type="radio" name="sc[mode]" value="test" <?php checked( $o['mode'], 'test' ); ?>> Тест — лише записи з переліку нижче</label><br>
							<label><input type="radio" name="sc[mode]" value="on" <?php checked( $o['mode'], 'on' ); ?>> Увімкнено — усі статті</label>
						</fieldset>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="sc_test_ids">ID тестових записів</label></th>
					<td><input class="regular-text" id="sc_test_ids" name="sc[test_ids]" value="<?php echo esc_attr( $o['test_ids'] ); ?>">
						<p class="description">Через кому. ID видно в адресі редактора: post.php?post=<strong>123</strong>. Тестову статтю можна закрити паролем або лишити «приватною».</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="sc_abetka_url">Адреса сторінки абетки</label></th>
					<td><input class="large-text" type="url" id="sc_abetka_url" name="sc[abetka_url]" value="<?php echo esc_attr( $o['abetka_url'] ); ?>" placeholder="https://…/klitynna_abetka">
						<p class="description">Без #якоря. Якір терміна додається автоматично.</p></td>
				</tr>
				<tr>
					<th scope="row"><label for="sc_max_links">Посилань на статтю, не більше</label></th>
					<td><input class="small-text" type="number" min="1" max="30" id="sc_max_links" name="sc[max_links]" value="<?php echo esc_attr( $o['max_links'] ); ?>"></td>
				</tr>
				<tr>
					<th scope="row"><label for="sc_post_types">Типи записів</label></th>
					<td><input class="regular-text" id="sc_post_types" name="sc[post_types]" value="<?php echo esc_attr( $o['post_types'] ); ?>">
						<p class="description">Через кому, технічні назви: post, page…</p></td>
				</tr>
				<tr>
					<th scope="row">Мовні версії</th>
					<td>
						<?php foreach ( array( 'uk' => 'Українська', 'ru' => 'Російська', 'en' => 'Англійська' ) as $l => $name ) : ?>
							<label style="margin-right:1em"><input type="checkbox" name="sc[langs][<?php echo esc_attr( $l ); ?>]" value="1" <?php checked( in_array( $l, (array) $o['langs'], true ) ); ?>> <?php echo esc_html( $name ); ?></label>
						<?php endforeach; ?>
						<p class="description">RU та EN: переклад назв і форми ще треба вичитати; визначень цими мовами немає, тому там посилання без підказки.</p>
					</td>
				</tr>
				<tr>
					<th scope="row">Підказки</th>
					<td>
						<label><input type="checkbox" name="sc[tooltips]" value="1" <?php checked( ! empty( $o['tooltips'] ) ); ?>> Показувати підказку з поясненням при наведенні</label><br>
						<label><input type="checkbox" name="sc[assets]" value="1" <?php checked( ! empty( $o['assets'] ) ); ?>> Підключати CSS і JS підказок із плагіна</label>
						<p class="description">Другу галочку зніміть, якщо vm-term-tip.css і term-tip.js уже підключені в темі.</p>
					</td>
				</tr>
			</tbody></table>
			<?php submit_button( 'Зберегти' ); ?>
		</form>

		<hr>
		<h2>Імпорт термінів</h2>
		<p>Зараз в абетці термінів: <strong><?php echo (int) $total; ?></strong>. Імпорт оновлює картки за якорем і додає нові; нічого не видаляє. Поле «Посилання на сторінку послуги» зберігається.</p>
		<form method="post" action="<?php echo $action; ?>" enctype="multipart/form-data">
			<input type="hidden" name="action" value="sc_abetka_import">
			<?php wp_nonce_field( 'sc_abetka_import' ); ?>
			<p><input type="file" name="sc_abetka_file" accept=".csv,text/csv"></p>
			<p class="description">Файл smartcell-abetka-terms.csv. Якщо файл не вибрано — береться той, що лежить у плагіні (data/).</p>
			<?php submit_button( 'Імпортувати', 'secondary' ); ?>
		</form>

		<hr>
		<h2>Сторінка абетки</h2>
		<p>Вставте в текст сторінки шорткод <code>[sc_abetka]</code> — він виводить усі терміни за літерами. Або скопіюйте готовий HTML нижче в редактор (режим «Текст»), якщо зміст сторінки будується з тексту запису.</p>
		<textarea class="large-text code" rows="10" readonly onclick="this.select()"><?php echo esc_textarea( sc_abetka_page_html() ); ?></textarea>
	</div>
	<?php
}

/* ---------- Галочка «без автопосилань» у статьи ---------- */

add_action( 'add_meta_boxes', 'sc_abetka_post_metabox' );
function sc_abetka_post_metabox() {
	$o = sc_abetka_options();
	foreach ( array_filter( array_map( 'trim', explode( ',', $o['post_types'] ) ) ) as $type ) {
		add_meta_box( 'sc_abetka_off', 'Клітинна абетка', 'sc_abetka_post_metabox_html', $type, 'side', 'low' );
	}
}

function sc_abetka_post_metabox_html( $post ) {
	wp_nonce_field( 'sc_abetka_off', 'sc_abetka_off_nonce' );
	echo '<label><input type="checkbox" name="_sc_abetka_off" value="1"' . checked( (bool) get_post_meta( $post->ID, '_sc_abetka_off', true ), true, false ) . '> Без автопосилань на абетку в цій статті</label>';
}

add_action( 'save_post', 'sc_abetka_post_save' );
function sc_abetka_post_save( $post_id ) {
	if ( ! isset( $_POST['sc_abetka_off_nonce'] ) || ! wp_verify_nonce( sanitize_key( $_POST['sc_abetka_off_nonce'] ), 'sc_abetka_off' ) ) {
		return;
	}
	if ( ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) || ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}
	if ( isset( $_POST['_sc_abetka_off'] ) ) {
		update_post_meta( $post_id, '_sc_abetka_off', '1' );
	} else {
		delete_post_meta( $post_id, '_sc_abetka_off' );
	}
}
