//////////////////////////////////////////////////////////////////////
// vp.js - Contrôleur principal et logique de l'application Visual Planner

function vp_main($scope, $timeout) {

    // Initialisation des états de vue et des messages
    $scope.view = "home";
    $scope.signed_in = false;
    $scope.sign_msg = "Not signed in";
    $scope.busy = false;

    // Options de configuration par défaut pour les sélecteurs
    $scope.multi_col_count_options = {
        1: "1", 2: "2", 3: "3", 4: "4", 6: "6", 12: "12"
    };

    // Configuration par défaut de l'application et des vues
    $scope.settings = {
        banner_text: "Visual Planner",
        vipconfig: {
            multi_col_count: 4,
            multi_col_count_portrait: 1,
            auto_scroll: true,
            auto_scroll_offset: 0,
            first_month: 1,
            weekends: [0, 6],
            first_day_of_week: 1,
            align_weekends: false,
            font_scale: 1,
            past_opacity: 0.5,
            month_names: "Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec",
            show_event_time: true,
            show_event_title: true,
            show_event_marker: true,
            colour_event_title: false,
            proportional_events: false,
            proportional_start_hour: 8,
            proportional_end_hour: 18,
            show_all_day_events: true,
            single_day_as_multi_day: false,
            show_timed_events: true,
            multi_day_as_single_day: false,
            first_day_only: false,
            marker_width: 1,
            multi_day_opacity: 1
        }
    };

    $scope.printinfo = {
        fontsize: "1em",
        cols: [],
        rows: []
    };

    // Gestion de l'authentification Google (via vip_oauth.js)
    var account = new AuthAccount();
    account.authClientID = typeof VP_CLIENT_ID !== 'undefined' ? VP_CLIENT_ID : '';
    account.authScope = "https://www.googleapis.com/auth/calendar.readonly";

    account.onSignIn = function() {
        $scope.$applyAsync(function() {
            $scope.signed_in = true;
            $scope.sign_msg = "Signed in as " + account.getEmail();
            $scope.view = "home";
            // Lancement du chargement du calendrier après connexion
            if (typeof LoadCalendar === 'function') {
                LoadCalendar();
            }
        });
    };

    account.onSignOut = function() {
        $scope.$applyAsync(function() {
            $scope.signed_in = false;
            $scope.sign_msg = "Not signed in";
            $scope.view = "settings";
        });
    };

    account.onError = function(msg) {
        $scope.$applyAsync(function() {
            $scope.sign_msg = "Error: " + msg;
        });
    };

    // Actions des boutons de l'interface utilisateur
    $scope.onclickSignIn = function() {
        account.SignIn();
    };

    $scope.onclickSignOut = function() {
        account.SignOut();
    };

    $scope.onclickSettings = function() {
        $scope.view = "settings";
    };

    $scope.onclickPrintView = function() {
        $scope.view = "print";
        if (typeof BuildPrintView === 'function') {
            BuildPrintView();
        }
    };

    $scope.onclickClosePrintView = function() {
        $scope.view = "home";
    };

    $scope.onclickSave = function() {
        $scope.busy = true;
        if (typeof SaveSettings === 'function') {
            SaveSettings(function() {
                $scope.$applyAsync(function() {
                    $scope.busy = false;
                    if ($scope.form) {
                        $scope.form.$setPristine();
                    }
                });
            });
        } else {
            $scope.busy = false;
        }
    };

    $scope.onclickCancel = function() {
        if (typeof LoadSettings === 'function') {
            LoadSettings();
        }
        $scope.view = "home";
        if ($scope.form) {
            $scope.form.$setPristine();
        }
    };

    // Initialisation du système au démarrage de la page
    angular.element(document).ready(function() {
        if (typeof LoadSettings === 'function') {
            LoadSettings();
        }
        account.Connect();
    });
}
