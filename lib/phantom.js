var page = new WebPage()
page.onConsoleMessage = function(msg) {
    console.log(msg)
}
page.open('http://localhost:3580/', function(status){
    page.evaluate(function(){
        console.log(navigator.userAgent)
    })
})