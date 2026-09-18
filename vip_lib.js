//////////////////////////////////////////////////////////////////////

function UIPlanner()
{
    this.grid_id = null;
    this.bar_id = null;
    this.config = this.GetDefaultConfig();
    this.calendars = {};
    this.events = {};
}

UIPlanner.prototype.GetDefaultConfig = function()
{
    return {
        multi_col_count: 3,
        multi_col_count_portrait: 1,
        auto_scroll: true,
        auto_scroll_offset: 0,
        first_month: 1,
        weekends: "0,6",
        first_day_of_week: 1,
        align_weekends: false,
        font_scale: 1.0,
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
        marker_width: 1.0,
        multi_day_opacity: 1.0
    };
};

UIPlanner.prototype.PatchConfig = function(cfg)
{
    var def = this.GetDefaultConfig();
    for (var k in def)
    {
        if (!cfg.hasOwnProperty(k))
            cfg[k] = def[k];
    }
};

UIPlanner.prototype.SetConfig = function(cfg)
{
    this.config = cfg;
    this.PatchConfig(this.config);
};

UIPlanner.prototype.Init = function(grid_id, bar_id)
{
    this.grid_id = grid_id;
    this.bar_id = bar_id;
    
    // Initialisation basique de l'UI si l'élément conteneur existe
    var gridEl = document.getElementById(this.grid_id);
    if (gridEl && gridEl.innerHTML === "") {
        gridEl.innerHTML = "<div style='padding: 2em; text-align: center; color: #666;'>Visual Planner Grid Initialized. Chargement des événements en cours...</div>";
    }

    if (typeof this.forwardDatespanChange === 'function')
    {
        var now = new Date();
        var y = now.getFullYear();
        var start = new Date(y, 0, 1);
        var end = new Date(y + 1, 0, 1);
        this.forwardDatespanChange({dtStart: start, dtEnd: end});
    }
};

UIPlanner.prototype.Clear = function()
{
    this.calendars = {};
    this.events = {};
    if (this.grid_id) {
        var el = document.getElementById(this.grid_id);
        if (el) el.innerHTML = "";
    }
};

UIPlanner.prototype.AddCalendar = function(cal)
{
    this.calendars[cal.cls] = cal;
};

UIPlanner.prototype.AddEvent = function(evt)
{
    this.events[evt.id] = evt;
};

UIPlanner.prototype.SetSetting = function(key, val)
{
    console.log("Setting " + key + " = " + val);
};

UIPlanner.prototype.Redraw = function()
{
    console.log("Redraw UIPlanner");
};

UIPlanner.prototype.GetPrintViewInfo = function()
{
    return {
        fontsize: "1em",
        cols: ["Mois", "Événements"],
        rows: []
    };
};
