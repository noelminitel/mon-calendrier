//////////////////////////////////////////////////////////////////////

function vp_main($scope, $window, $timeout)
{
    $scope.view = "home";
    $scope.sign_msg = "";
    $scope.signed_in = false;
    $scope.g_signbtn_ok = false;
    $scope.busy = false;

    $scope.settings = {
        banner_text: "Visual Planner",
        vipconfig: {}
    };

    $scope.multi_col_count_options = {
        1: "1", 2: "2", 3: "3", 4: "4", 6: "6", 12: "12"
    };

    var account = new AuthAccount();
    var appdata = new AuthAppData();
    var cal = new AuthCal();
    var ui = new UIPlanner();

    appdata.file_name = "visual_planner.json";
    appdata.Patch = ui.PatchConfig.bind(ui);

    appdata.setDefault({
        banner_text: "Visual Planner",
        vipconfig: ui.GetDefaultConfig()
    });

    account.authScope = "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/drive.appdata";

    account.onSignIn = function()
    {
        $scope.$apply(function() {
            $scope.signed_in = true;
            $scope.sign_msg = "Signed in as " + account.getEmail();
        });

        gapi.load('client', function() {
            gapi.client.init({}).then(function() {
                appdata.Read(onReadAppdata, onFailAppdata);
            });
        });
    };

    account.onSignOut = function()
    {
        $scope.$apply(function() {
            $scope.signed_in = false;
            $scope.sign_msg = "Not signed in";
            $scope.view = "home";
        });
        ui.Clear();
    };

    account.onError = function(msg)
    {
        $scope.$apply(function() {
            $scope.sign_msg = "Error: " + msg;
        });
    };

    cal.forwardCalendar = ui.AddCalendar.bind(ui);
    cal.forwardEvent = ui.AddEvent.bind(ui);
    cal.forwardEventReloadReq = function() { cal.loadEvents(); };
    cal.forwardSetting = ui.SetSetting.bind(ui);
    cal.onError = function(msg) { console.error("Cal error: " + msg); };

    ui.forwardDatespanChange = function(span) {
        cal.datespan = span;
        cal.loadEvents();
    };

    ui.forwardRedrawReq = function() {
        ui.Redraw();
    };

    function onReadAppdata()
    {
        var data = appdata.getAppData();
        
        $scope.$apply(function() {
            if (data) {
                $scope.settings = data;
            }
            ui.SetConfig($scope.settings.vipconfig);
        });

        ui.Init("grid", "calendarbar");
        cal.loadEvents();
    }

    function onFailAppdata(msg)
    {
        console.error("Appdata read error: " + msg);
        onReadAppdata();
    }

    $scope.onclickSignIn = function()
    {
        account.SignIn();
    };

    $scope.onclickSignOut = function()
    {
        account.SignOut();
    };

    $scope.onclickSettings = function()
    {
        $scope.view = "settings";
        if ($scope.form) {
            $scope.form.$setPristine();
        }
    };

    $scope.onclickCancel = function()
    {
        $scope.view = "home";
        var data = appdata.getAppData();
        if (data) {
            $scope.settings = data;
            ui.SetConfig($scope.settings.vipconfig);
            ui.Redraw();
        }
    };

    $scope.onclickSave = function()
    {
        $scope.busy = true;
        appdata.Write($scope.settings, function() {
            $scope.$apply(function() {
                $scope.busy = false;
                $scope.view = "home";
                if ($scope.form) {
                    $scope.form.$setPristine();
                }
                ui.SetConfig($scope.settings.vipconfig);
                ui.Redraw();
            });
        }, function(msg) {
            $scope.$apply(function() {
                $scope.busy = false;
                alert("Save failed: " + msg);
            });
        });
    };

    $scope.onclickPrintView = function()
    {
        $scope.view = "print";
        $scope.printinfo = ui.GetPrintViewInfo();
    };

    $scope.onclickClosePrintView = function()
    {
        $scope.view = "home";
    };

    // Lancement de la connexion
    account.Connect();
}
