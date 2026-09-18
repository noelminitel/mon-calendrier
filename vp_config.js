var g_client_id = '749475982945-me64prs1nn6og0ghqj7ifgc4c6js71ta.apps.googleusercontent.com';
var g_api_key = 'AIzaSyAHbw39l4a3ZHosnTKGmMpVkKEozKnBVMU';

// Google Analytics (conservez cette partie si vous l'avez)
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');
ga('create', 'UA-60115120-4', 'auto');
ga('send', 'pageview');

function ga_hit(category, action) {
    if (window.ga && ga.loaded)
        ga('send', 'event', {'eventCategory': category, 'eventAction': action.toString()});
}
