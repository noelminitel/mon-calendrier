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
    // 1. On vérifie si un token valide est enregistré dans le navigateur
    var savedToken = localStorage.getItem('vp_access_token');
    var savedExpiry = localStorage.getItem('vp_token_expiry');
    var now = new Date().getTime();

    if (savedToken && savedExpiry && now < parseInt(savedExpiry)) {
        this.access_token = savedToken;
        
        // Attente de l'objet gapi pour injecter le token en arrière-plan
        var checkGapi = setInterval(() => {
            if (typeof gapi !== 'undefined' && gapi.client) {
                clearInterval(checkGapi);
                gapi.client.setToken({ access_token: this.access_token });
                
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
            }
        }, 100);
        return;
    }

    // 2. Si aucun token valide n'existe, on prépare uniquement le client Google pour le clic manuel.
    // AUCUNE POPUP NE S'OUVRE TOUTE SEULE.
    var initTimer = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            clearInterval(initTimer);
            
            if (!this.tokenClient) {
                this.tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: this.authClientID,
                    scope: this.authScope,
                    callback: (response) => {
                        if (response.error) {
                            this.onSignOut();
                            return;
                        }
                        this.access_token = response.access_token;
                        
                        var expiresAt = new Date().getTime() + (response.expires_in || 3600) * 1000;
                        localStorage.setItem('vp_access_token', this.access_token);
                        localStorage.setItem('vp_token_expiry', expiresAt);
                        
                        if (typeof gapi !== 'undefined' && gapi.client) {
                            gapi.client.setToken({ access_token: this.access_token });
                        }
                        
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
            }
        }
    }, 200);

    // On indique à l'application de rester sagement sur l'écran déconnecté (bouton Sign In)
    this.onSignOut();
}

AuthAccount.prototype.SignIn = function()
{
    if (this.tokenClient) {
        // La popup ne s'ouvre QUE lorsque vous cliquez explicitement sur "Sign In"
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
    
    // Nettoyage du stockage local à la déconnexion
    localStorage.removeItem('vp_access_token');
    localStorage.removeItem('vp_token_expiry');

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
// (Les objets AuthAppData et AuthCal restent inchangés en dessous)
