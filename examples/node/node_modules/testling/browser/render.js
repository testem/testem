var Stream = require('stream');
var domready = require('domready');
var json = typeof JSON === 'object' ? JSON : require('jsonify');

var stream = module.exports = new Stream;
stream.writable = true;

var ready = false;
var buffered = [];
domready(function () {
    renderInitialHTML()

    ready = true;
    buffered.forEach(function (msg) {
        stream.write(msg);
    });
    buffered = [];
});

var reportUl
    , passesEm
    , passes = 0
    , failuresEm
    , failures = 0
    , currentRootUl

stream.write = function (msg) {
    if (!ready) {
        buffered.push(msg);
        return;
    }

    if (typeof msg === "string") {
        var suiteLi = document.createElement("li")
        suiteLi.classList.add("suite")
        var h1 = document.createElement("h1")
        h1.textContent = msg
        suiteLi.appendChild(h1)
        var suiteUl = document.createElement("ul")
        suiteLi.appendChild(suiteUl)
        reportUl.appendChild(suiteLi)
        currentRootUl = suiteUl

        return
    }

    if (msg.ok === undefined) {
        return
    }

    var testLi = document.createElement("li")
    testLi.classList.add("test")
    var h2 = document.createElement("h2")
    h2.textContent = msg.name
    testLi.appendChild(h2)

    if (msg.ok) {
        testLi.classList.add("pass")
        passes++
        passesEm.textContent = passes
    } else {
        testLi.classList.add("fail")
        var error = document.createElement("pre")
        error.classList.add("error")
        error.textContent = msg.stack && msg.stack.join("\n")
        testLi.appendChild(error)
        failures++
        failuresEm.textContent = failures
    }

    currentRootUl.appendChild(testLi)
};

stream.end = function (msg) {
    if (msg !== undefined) {
        stream.write(msg);
    }
    stream.writable = false;
};

function renderInitialHTML() {
    var body = document.body

    var rootDiv = document.createElement("div")
    rootDiv.id = "root"
    body.appendChild(rootDiv)

    var statsUl = fragment(statsTemplate)
    rootDiv.appendChild(statsUl)

    reportUl = document.createElement("ul")
    reportUl.id = "report"
    rootDiv.appendChild(reportUl)

    currentRootUl = reportUl

    var items = statsUl.getElementsByTagName("li")

    passesEm = items[0].getElementsByTagName("em")[0]
    failuresEm = items[1].getElementsByTagName("em")[0]

    var style = document.createElement("style")
    style.type = "text/css"
    style.textContent = pageCSS
    document.body.appendChild(style)
}

var statsTemplate = '<ul id="stats">' +
    '<li class="passes">passes: <em>0</em></li>'+
    '<li class="failures">failures: <em>0</em></li>' +
    '</ul>'

var pageCSS =
    "body {" +
        "font: 20px/1.5 'Helvetica Neue', Helvetica, Arial, sans-serif;" +
        "padding: 60px 50px;" +
    "}\n" +
    "#root ul, #root li {" +
        "margin: 0;" +
        "padding: 0;" +
    "}\n" +
    "#root ul {" +
        "list-style: none;" +
    "}\n" +
    "#root h1, #root h2 {" +
        "margin: 0;" +
    "}\n" +
    "#root h1 {" +
        "margin-top: 15px;" +
        "font-size: 1em;" +
        "font-weight: 200;" +
    "}\n" +
    "#root h2 {" +
        "font-size: 12px;" +
        "font-weight: normal;" +
        "cursor: pointer;" +
    "}\n" +
    "#root .suite {" +
        "margin-left: 15px;" +
    "}\n" +
    "#root .test {" +
        "margin-left: 15px;" +
    "}\n" +
    "#root .test.pass::before {" +
        "content: '✓';" +
        "font-size: 12px;" +
        "display: block;" +
        "float: left;" +
        "margin-right: 5px;" +
        "color: #00d6b2;" +
    "}\n" +
    "#root .test.fail {" +
        "color: #c00;" +
    "}\n" +
    "#root .test.fail pre {" +
        "color: black;" +
    "}\n" +
    "#root .test.fail::before {" +
        "content: '✖';" +
        "font-size: 12px;" +
        "display: block;" +
        "float: left;" +
        "margin-right: 5px;" +
        "color: #c00;" +
    "}\n" +
    "#root .test pre.error {" +
        "color: #c00;" +
    "}\n" +
    "#root .test pre {" +
        "display: inline-block;" +
        "font: 12px/1.5 monaco, monospace;" +
        "margin: 5px;" +
        "padding: 15px;" +
        "border: 1px solid #eee;" +
        "border-bottom-color: #ddd;" +
        "-webkit-border-radius: 3px;" +
        "-webkit-box-shadow: 0 1px 3px #eee;" +
    "}\n" +
    "#stats {" +
        "position: fixed;" +
        "top: 15px;" +
        "right: 10px;" +
        "font-size: 12px;" +
        "margin: 0;" +
        "color: #888;" +
    "}\n" +
    "#stats em {" +
        "color: black;" +
    "}\n" +
    "#stats li {" +
        "display: inline-block;" +
        "margin: 0 5px;" +
        "list-style: none;" +
        "padding-top: 11px;" +
    "}\n"


function fragment(html) {
  var args = arguments
    , div = document.createElement('div')
    , i = 1;

  div.innerHTML = html.replace(/%([se])/g, function(_, type){
    switch (type) {
      case 's': return String(args[i++]);
      case 'e': return escape(args[i++]);
    }
  });

  return div.firstChild;
}
