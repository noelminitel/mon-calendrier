//////////////////////////////////////////////////////////////////////

function AuthAccount()
{
    // initialise
    this.authClientID = undefined;
    this.authScope = undefined;

    // public
    this.onSignIn = function(){};
    this.onSignOut = function(){};
    this.onError = function(msg){};

    // private
    this.tokenClient = null;
    this.access_token = null;
    this.userEmail = null;
}

AuthAccount.prototype.Connect = function()
{
    if (this.tokenClient)
        return;

    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
        setTimeout(this.Connect.bind(this), 500);
        return;
    }

    this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: this.authClientID,
        scope: this.authScope,
        callback: (response) => {
            if (response.error) {
                // En mode silencieux, si l'utilisateur n'est pas connecté, on bascule proprement sur l'état déconnecté
                this.onSignOut();
                return;
            }
            this.access_token = response.access_token;
            
            // Injecte le token directement dans gapi.client pour que gapi.client.request fonctionne
            gapi.client.setToken({ access_token: this.access_token });
            
            // Récupère l'email de l'utilisateur via l'API UserInfo
            fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: 'Bearer ' + this.access_token }
            })
            .then(res => res.json())
            .then(data => {
                this.userEmail = data.email;
                this.onSignIn();
            })
            .catch(() => {
                this.onSignIn();
            });
        },
    });

    // CORRECTION : Attend 1 seconde que AngularJS et la page soient prêts avant de lancer la reconnexion silencieuse
    setTimeout(() => {
        try {
            this.tokenClient.requestAccessToken({prompt: ''});
        } catch(e) {
            this.onSignOut();
        }
    }, 1000);
}

AuthAccount.prototype.SignIn = function()
{
    if (this.tokenClient) {
        // Ouvre la popup de consentement Google uniquement lors d'un clic manuel explicite
        this.tokenClient.requestAccessToken({prompt: 'consent'});
    }
}

AuthAccount.prototype.SignOut = function()
{
    if (this.access_token) {
        google.accounts.oauth2.revoke(this.access_token, () => {});
    }
    this.access_token = null;
    this.userEmail = null;
    if (typeof gapi !== 'undefined' && gapi.client) {
        gapi.client.setToken(null);
    }
    this.onSignOut();
}

AuthAccount.prototype.isSignedIn = function()
{
    return (this.access_token !== null && this.access_token !== undefined);
}

AuthAccount.prototype.getEmail = function()
{
    return this.userEmail;
}

AuthAccount.prototype.Fail = function(reason)
{
    var msg = "";
    if (reason.error)
    {
        msg = "[" + reason.error + "]";
        if (reason.message)
            msg += " " + reason.message;
    }
    else {
        msg = JSON.stringify(reason);
    }

    console.error("AuthAccount : " + msg);
    this.onError(msg);
}




//////////////////////////////////////////////////////////////////////

function AuthAppData()
{
    // initialise
    this.file_name = null;
    this.Patch = function(){};

    // private
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
    if (response.result && response.result.files && response.result.files.length == 1)
        this.file_id = response.result.files[0].id;

    this.onLoad()
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
    this.appdata = typeof response.body === 'string' ? response.body : JSON.stringify(response.result);
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
    catch(e) {this.onError(reason.status || "Erreur réseau");}
}




//////////////////////////////////////////////////////////////////////

function AuthCal()
{
    // initialise
    this.datespan = {dtStart: null, dtEnd: null};
    this.forwardCalendar = function(){};
    this.forwardEvent = function(){};
    this.forwardEventReloadReq = function(){};
    this.forwardSetting = function(){};
    this.onError = function(){};
    this.calclass_prefix = "calclass_";

    // private
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
    catch(e) {this.onError(reason.status || "Erreur");}
}
