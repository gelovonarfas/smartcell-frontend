<?php
/**
 * Plugin Name: SmartCell: Клітинна абетка
 * Description: Картки термінів «Клітинної абетки», імпорт із CSV, шорткод [sc_abetka] для сторінки абетки та автопосилання з підказками в статтях журналу.
 * Version:           1.2.2
 * Author: Maximorum
 * Requires PHP: 7.2
 * Text Domain: smartcell-abetka
 *
 * Как устроено (коротко, подробно — docs/glossary/plugin/README.md в ките):
 *  - inc/i18n.php      — языки: поля карточки в формате qTranslate, вкладки языков в редакторе;
 *  - inc/terms.php     — тип записи «Термін» (sc_term), поля карточки, кеш индекса форм;
 *  - inc/import.php    — импорт CSV (кнопка в админке и WP-CLI), обновление по якорю;
 *  - inc/autolink.php  — фильтр the_content: первое упоминание термина → ссылка + подсказка;
 *  - inc/shortcode.php — [sc_abetka]: буквы (H2), термины (H3 с якорем), определения;
 *  - inc/settings.php  — страница «Налаштування та імпорт», галочка «без автопосилань» у статьи.
 *
 * В базу статей плагин ничего не пишет: ссылки подставляются на выводе.
 * Выключили плагин или режим — тексты остаются как были.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SC_ABETKA_VER', '1.2.2' );
define( 'SC_ABETKA_DIR', plugin_dir_path( __FILE__ ) );
define( 'SC_ABETKA_URL', plugin_dir_url( __FILE__ ) );
define( 'SC_ABETKA_CSV', SC_ABETKA_DIR . 'data/smartcell-abetka-terms.csv' );

require_once SC_ABETKA_DIR . 'inc/i18n.php';
require_once SC_ABETKA_DIR . 'inc/terms.php';
require_once SC_ABETKA_DIR . 'inc/import.php';
require_once SC_ABETKA_DIR . 'inc/autolink.php';
require_once SC_ABETKA_DIR . 'inc/shortcode.php';
require_once SC_ABETKA_DIR . 'inc/settings.php';

/**
 * Настройки с умолчаниями. После активации режим — «вимкнено»:
 * плагин ничего не меняет на сайте, пока его не включат на странице настроек.
 */
function sc_abetka_options() {
	$defaults = array(
		'mode'       => 'off',   // off | test | on
		'test_ids'   => '',      // ID записей через запятую — для режима test
		'post_types' => 'post',  // типы записей через запятую
		'abetka_url' => '',      // адрес страницы абетки, без #якоря
		'max_links'  => 7,
		'langs'      => array( 'uk' ),
		'tooltips'   => 1,
		'assets'     => 1,       // подключать CSS и JS подсказок из плагина
		'auto'       => 0,       // 1 — сам вешается на the_content; 0 — тема вызывает sc_abetka_apply()
	);
	$saved = get_option( 'sc_abetka', array() );
	return array_merge( $defaults, is_array( $saved ) ? $saved : array() );
}

/**
 * Язык текущей версии страницы: qTranslate-X / qTranslate-XT, иначе локаль сайта.
 * qTranslate часто называет украинский «ua» — приводим к «uk».
 */
function sc_abetka_lang() {
	if ( function_exists( 'qtranxf_getLanguage' ) ) {
		$lang = qtranxf_getLanguage();
	} elseif ( function_exists( 'qtrans_getLanguage' ) ) {
		$lang = qtrans_getLanguage();
	} else {
		$lang = substr( get_locale(), 0, 2 );
	}
	if ( 'ua' === $lang ) {
		$lang = 'uk';
	}
	return apply_filters( 'sc_abetka_lang', $lang );
}
