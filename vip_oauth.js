//////////////////////////////////////////////////////////////////////
// AuthAccount - Google Identity Services (GIS) avec Reconnexion Auto Sécurisée
//////////////////////////////////////////////////////////////////////

function AuthAccount() {
    this.authClientID = undefined;
    this.authScope = undefined;

    this.onSignIn = function(){};
    this.onSignOut = function(){};
    this.onError = function(msg){};

    this.tokenClient = null;
    this.access_token = null;
    this.userEmail = null;
    this._isSignedIn = false;
}

AuthAccount.prototype.Connect = function() {
    var self = this;

    gapi.load('client', function() {
        gapi.client.init({}).then(function() {
            if (typeof google !== 'undefined' && google.accounts) {
                self.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: self.authClientID,
                    scope: self.authScope,
                    callback: function(tokenResponse) {
                        if (tokenResponse.error !== undefined) {
                            if (tokenResponse.error === 'interaction_required' || tokenResponse.error === 'login_required' || tokenResponse.error === 'popup_closed_by_user') {
                                localStorage.removeItem("vp_auto_connect");
                            }
                            self.Fail(tokenResponse);
                            self.onSignOut();
                            return;
                        }
                        self.access_token = tokenResponse.access_token;
                        gapi.client.setToken({ access_token: self.access_token });
                        self._isSignedIn = true;
                        
                        // Mémorisation de la session
                        localStorage.setItem("vp_auto_connect", "true");
                        
                        self.fetchUserEmail();
                    }
                });

                // Tentative de reconnexion automatique sécurisée avec délai pour éviter le blocage UI
                if (localStorage.getItem("vp_auto_connect") === "true") {
                    setTimeout(function() {
                        try {
                            self.tokenClient.requestAccessToken({prompt: 'none'});
                        } catch(e) {
                            console.log("Reconnexion automatique silencieuse impossible :", e);
                            localStorage.removeItem("vp_auto_connect");
                            self.onSignOut();
                        }
                    }, 500);
                } else {
                    self.onSignOut();
                }

            } else {
                self.onError("Google Identity Services script non chargé.");
            }
        }).catch(function(err) {
            self.Fail(err);
        });
    });
}

AuthAccount.prototype.fetchUserEmail = function() {
    var self = this;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://www.googleapis.com/oauth2/v3/userinfo');
    xhr.setRequestHeader('Authorization', 'Bearer ' + this.access_token);
    xhr.onload = function() {
        if (xhr.status === 200) {
            var userInfo = JSON.parse(xhr.responseText);
            self.userEmail = userInfo.email;
        }
        self.onSignIn();
        self.postSignInWatch();
    };
    xhr.onerror = function() {
        self.onSignIn();
        self.postSignInWatch();
    };
    xhr.send();
}

AuthAccount.prototype.postSignInWatch = function() {
    if (this.isSignedIn()) {
        gapi.client.request({
            path: "https://www.googleapis.com/calendar/v3/users/me/settings/watch",
            method: "POST"
        }).then(function(){}, function(){});
    }
}

AuthAccount.prototype.SignIn = function() {
    if (this.tokenClient) {
        this.tokenClient.requestAccessToken({prompt: 'select_account'});
    } else {
        this.onError("Le client d'authentification n'est pas initialisé.");
    }
}

AuthAccount.prototype.SignOut = function() {
    if (this.access_token && typeof google !== 'undefined') {
        google.accounts.oauth2.revoke(this.access_token, function() {
            console.log('Token révoqué');
        });
    }
    // Suppression propre de la mémoire de connexion
    localStorage.removeItem("vp_auto_connect");
    
    this.access_token = null;
    this.userEmail = null;
    this._isSignedIn = false;
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken(null);
    }
    this.onSignOut();
}

AuthAccount.prototype.isSignedIn = function() {
    return this._isSignedIn && (this.access_token !== null);
}

AuthAccount.prototype.getEmail = function() {
    return this.userEmail || "Compte Google Connecté";
}

AuthAccount.prototype.Fail = function(reason) {
    var msg = "";
    if (reason && reason.error) {
        msg = "[" + reason.error + "]";
        if (reason.message) msg += " " + reason.message;
        else if (reason.details) msg += " " + reason.details;
    } else if (typeof reason === 'string') {
        msg = reason;
    } else {
        msg = "Erreur d'authentification";
    }
    console.error("AuthAccount Error : ", reason);
    this.onError(msg);
}


//////////////////////////////////////////////////////////////////////
// AuthAppData
//////////////////////////////////////////////////////////////////////

function AuthAppData()
{
    this.file_name = null;
    this.Patch = function(){};
    this.file_id = null;
    this.appdata = null;
    this.appdata_default = null;
    this.onLoad = undefined;
    this.onRead = undefined;
    this.onWrite = undefined;
    this.onError = function(){};
}

AuthAppData.prototype.FileInfo = function()
{
    this.makeReq ({
            path: "https://www.googleapis.com/drive/v3/files",
            method: "GET",
            params: {spaces: 'appDataFolder'}
        },
        this.thenShowFileInfo
    );
}

AuthAppData.prototype.thenShowFileInfo = function(response)
{
    var files = response.result.files;
    console.log(files.length + " files");
    for (var i=0; i < files.length; i++)
        console.log(files[i]);
}

AuthAppData.prototype.LoadFile = function(thenDoThis)
{
    this.file_id = null;
    this.onLoad = thenDoThis;
    var file_query = "name = '" + this.file_name + "'";

    this.makeReq ({
            path: "https://www.googleapis.com/drive/v3/files",
            method: "GET",
            params: {q: file_query, spaces: 'appDataFolder'}
        },
        this.thenSetFileID
    );
}

AuthAppData.prototype.thenSetFileID = function(response)
{
    if (response.result.files.length == 1)
        this.file_id = response.result.files[0].id;

    this.onLoad();
}

AuthAppData.prototype.Read = function(thenDoThis, thenFail)
{
    this.appdata = null;
    this.onRead = thenDoThis;
    if (thenFail)
        this.onError = thenFail;

    this.LoadFile(this.thenReadFile);
}

AuthAppData.prototype.thenReadFile = function()
{
    if (this.file_id)
    {
        this.makeReq ({
                path: "https://www.googleapis.com/drive/v3/files/" + encodeURIComponent(this.file_id),
                method: "GET",
                params: {alt: 'media'}
            },
            this.thenSetAppdata
        );
    }
    else this.onRead();
}

AuthAppData.prototype.thenSetAppdata = function(response)
{
    this.appdata = response.body;
    this.onRead();
}

AuthAppData.prototype.setAppData = function(appdataobj)
{
    this.appdata = appdataobj ? JSON.stringify(appdataobj) : null;
}

AuthAppData.prototype.setDefault = function(appdataobj)
{
    this.appdata_default = appdataobj ? JSON.stringify(appdataobj) : null;
}

AuthAppData.prototype.getAppData = function()
{
    var d = null;
    if (this.appdata)
        d = JSON.parse(this.appdata);
    else if (this.appdata_default)
        d = JSON.parse(this.appdata_default);

    if (d)
        this.Patch(d);

    return d;
}

AuthAppData.prototype.Write = function(appdataobj, thenDoThis, thenFail)
{
    this.setAppData(appdataobj);
    this.onWrite = thenDoThis;
    if (thenFail)
        this.onError = thenFail;

    this.LoadFile(this.thenWriteOrCreate);
}

AuthAppData.prototype.thenWriteOrCreate = function()
{
    if (this.file_id)
    {
        this.WriteFile();
    }
    else
    {
        this.makeReq ({
                path: "https://www.googleapis.com/drive/v3/files",
                method: "POST",
                params: {uploadType: "resumable"},
                body: {name: this.file_name, mimeType:"application/json", parents: ['appDataFolder']}
            },
            this.thenSetNewFileID
        );
    }
}

AuthAppData.prototype.thenSetNewFileID = function(response)
{
    this.file_id = response.result.id;
    this.WriteFile();
}

AuthAppData.prototype.WriteFile = function()
{
    console.assert(this.file_id);
    this.makeReq ({
            path: "https://www.googleapis.com/upload/drive/v3/files/" + encodeURIComponent(this.file_id),
            method: "PATCH",
            params: {uploadType: "media"},
            body: this.appdata
        },
        this.onWrite
    );
}

AuthAppData.prototype.makeReq = function(req, callback)
{
    gapi.client.request(req).then(callback.bind(this), this.Fail.bind(this));
}

AuthAppData.prototype.Fail = function(reason)
{
    console.error(reason);
    try {this.onError(reason.result.error.message);}
    catch(e) {
        try {this.onError(reason.status); } catch(ex) { this.onError("Erreur réseau/API Drive"); }
    }
}


//////////////////////////////////////////////////////////////////////
// AuthCal
//////////////////////////////////////////////////////////////////////

function AuthCal()
{
    this.datespan = {dtStart: null, dtEnd: null};
    this.forwardCalendar = function(){};
    this.forwardEvent = function(){};
    this.forwardEventReloadReq = function(){};
    this.forwardSetting = function(){};
    this.onError = function(){};
    this.calclass_prefix = "calclass_";

    this.calendars = null;
    this.run = false;
}

AuthCal.prototype.loadEvents = function()
{
    this.isoStart = this.datespan.dtStart.toISOString();
    this.isoEnd = this.datespan.dtEnd.toISOString();

    if (this.calendars)
    {
        if (this.run)
            this.reqLoadEvents();
    }
    else
    {
        this.makeReq ({
                path: "https://www.googleapis.com/calendar/v3/users/me/settings/format24HourTime",
                method: "GET",
                params: {}
            },
            this.rcvTimeFormat
        );

        this.makeReq ({
                path: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                method: "GET",
                params: {}
            },
            this.rcvCalList
        );

        this.calendars = {};
    }
}

AuthCal.prototype.syncEvents = function()
{
    if (this.calendars)
        this.reqSyncEvents();
}

AuthCal.prototype.rcvTimeFormat = function(callsign, response)
{
    if (response.result)
    if (response.result.kind == "calendar#setting")
    if (response.result.id == "format24HourTime")
        this.forwardSetting("time24h", response.result.value == "true");
}

AuthCal.prototype.rcvCalList = function(callsign, response)
{
    try
    {
        for (var i in response.result.items)
        {
            var cal = response.result.items[i];
            if (cal.selected)
            {
                this.calendars[cal.id] = {cls: this.calclass_prefix + i, name: cal.summary, colour: cal.backgroundColor, synctok: null};
                this.forwardCalendar(this.calendars[cal.id]);
            }
        }

        if (response.result.nextPageToken)
        {
            this.makeReq ({
                    path: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
                    method: "GET",
                    params: {pageToken: response.result.nextPageToken}
                },
                this.rcvCalList
            );
        }
        else
        {
            this.run = true;
            this.reqLoadEvents();
        }
    }
    catch(e)
    {
        this.Fail(e);
    }
}

AuthCal.prototype.reqLoadEvents = function()
{
    for (var cal_id in this.calendars)
        this.reqEvents({timeMin: this.isoStart, timeMax: this.isoEnd}, this.rcvLoadEvents, cal_id);
}

AuthCal.prototype.reqSyncEvents = function()
{
    for (var cal_id in this.calendars)
    {
        var tok = this.calendars[cal_id].synctok;
        if (tok)
            this.reqEvents({syncToken: tok}, this.rcvSyncEvents, cal_id);
    }
}

AuthCal.prototype.rcvLoadEvents = function(callsign, response)
{
    var cal = this.calendars[callsign];
    for (var i in response.result.items)
    {
        var evt = this.createEvent(cal, response.result.items[i]);
        if (evt)
        if (!evt.deleted)
            this.forwardEvent(evt);
    }

    if (response.result.nextPageToken)
        this.reqEvents({pageToken: response.result.nextPageToken, timeMin: this.isoStart, timeMax: this.isoEnd}, this.rcvLoadEvents, callsign);
    else if (response.result.nextSyncToken)
        cal.synctok = response.result.nextSyncToken;
}

AuthCal.prototype.rcvSyncEvents = function(callsign, response)
{
    var cal = this.calendars[callsign];
    for (var i in response.result.items)
    {
        var evt = this.createEvent(cal, response.result.items[i]);
        if (evt)
        {
            this.forwardEvent({id: evt.id, deleted: true});
            if (!evt.deleted)
                this.forwardEvent(evt);
        }
    }

    if (response.result.nextPageToken)
        this.reqEvents({pageToken: response.result.nextPageToken, syncToken: cal.synctok}, this.rcvSyncEvents, callsign);
    else if (response.result.nextSyncToken)
        cal.synctok = response.result.nextSyncToken;
}

AuthCal.prototype.reqEvents = function(req_params, callback, cal_id)
{
    req_params.singleEvents = true;
    this.makeReq ({
            path: "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(cal_id) + "/events",
            method: "GET",
            params: req_params
        },
        callback,
        cal_id
    );
}

AuthCal.prototype.createEvent = function(cal, item)
{
    try
    {
        if (item.kind != "calendar#event")
            return null;
        if (item.status == "cancelled")
            return {id: item.id, deleted: true};
        if (item.hasOwnProperty("recurrence"))
            return null;
        if (!item.hasOwnProperty("start"))
            return null;

        var evt = {
            id: item.id,
            title: item.summary,
            eid: item.htmlLink,
            calclass: cal.cls,
            colour: cal.colour,
            calendar: cal.name
        };

        if ("dateTime" in item.start)
        {
            evt.timed = true;
            evt.timespan = {start: item.start.dateTime, end: item.end.dateTime};
        }
        else
        {
            evt.timed = false;
            evt.datespan = {start: item.start.date, end: item.end.date};
        }

        return evt;
    }
    catch(e)
    {
        this.Fail(e);
    }
}

AuthCal.prototype.makeReq = function(req, callback, callsign)
{
    gapi.client.request(req).then(callback.bind(this, callsign), this.Fail.bind(this));
}

AuthCal.prototype.Fail = function(reason)
{
    console.error(reason);
    if (reason.status == 410)
    {
        this.forwardEventReloadReq();
        return;
    }
    try {this.onError(reason.result.error.message);}
    catch(e) {
        try {this.onError(reason.status);} catch(ex) {this.onError("Erreur API Calendar");}
    }
}


//////////////////////////////////////////////////////////////////////
// UnAuthCal
//////////////////////////////////////////////////////////////////////

function UnAuthCal()
{
    // initialise
    this.datespan = {dtStart: null, dtEnd: null};
    this.forwardEvent = function(){};
    this.api_key = "";

    // private
    this.calendars = {};
}

UnAuthCal.prototype.addCal = function(id)
{
    this.calendars[id] = {clr: "#2b67cf"};
}

UnAuthCal.prototype.setCalClr = function(id, clr)
{
    this.calendars[id].clr = clr;
}

UnAuthCal.prototype.loadEvents = function()
{
    this.isoStart = this.datespan.dtStart.toISOString();
    this.isoEnd = this.datespan.dtEnd.toISOString();

    for (var id in this.calendars)
        this.reqEvents(id);
}

UnAuthCal.prototype.reqEvents = function(id, tok)
{
    var path =
        "https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(id) + "/events" +
        "?timeMin=" + this.isoStart +
        "&timeMax=" + this.isoEnd +
        "&key=" + this.api_key +
        "&singleEvents=true"
    ;
    
    if (tok)
        path += ("&pageToken=" + tok);

    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = this.rcvEvents.bind(this, xhttp, id);
    xhttp.open("GET", path);
    xhttp.send();
}

UnAuthCal.prototype.rcvEvents = function(xhttp, callsign)
{
    if (xhttp.readyState == 4 && xhttp.status == 200)
    {
        var response = JSON.parse(xhttp.responseText);
        var cal = this.calendars[callsign];
        
        for (var i in response.items)
        {
            var item = response.items[i];

            if (item.kind == "calendar#event")
            if (item.status != "cancelled")
            if (!item.hasOwnProperty("recurrence"))
            if (item.hasOwnProperty("start"))
            {
                var evt = {
                    id: item.id,
                    title: item.summary,
                    colour: cal.clr,
                    calendar: response.summary
                };
                
                if ("dateTime" in item.start)
                {
                    evt.timed = true;
                    evt.timespan = {start: item.start.dateTime, end: item.end.dateTime};
                }
                else
                {
                    evt.timed = false;
                    evt.datespan = {start: item.start.date, end: item.end.date};
                }

                this.forwardEvent(evt);
            }
        }

        if (response.nextPageToken)
            this.reqEvents(callsign, response.nextPageToken);
    }
}
