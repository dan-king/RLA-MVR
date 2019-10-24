//var ts = new Date(Number(new Date()))
console.log("***************************************")
console.log("BEGIN index.js ", Date(Number(new Date())) )
console.log("***************************************")

var express = require('express')
var app = express()
var path = require('path')
var env = process.env.NODE_ENV || 'development'

// ===============================================
// Define static public directory
// ===============================================
app.use(express.static(__dirname + '/public'))

// ===============================================
// Set copyright to current year
// ===============================================
app.locals.copyrightYear = new Date().getFullYear()

// ===============================================
// Use favicon
// ===============================================
//npm install --save serve-favicon
var favicon = require('serve-favicon')
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))

// ===============================================
// Set up Handlebars view engine
// ===============================================
var handlebars = require('express-handlebars').create({ defaultLayout:'main' })
app.engine('handlebars', handlebars.engine)
app.set('view engine', 'handlebars')
var HB = require('handlebars')
HB.registerHelper("math", function(lvalue, operator, rvalue, options) {
    lvalue = parseFloat(lvalue)
    rvalue = parseFloat(rvalue)
    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator]
})
HB.registerHelper("setVar", function(varName, varValue, options) {
    options.data.root[varName] = varValue
})

// Load handlebars number formatter
// https://www.npmjs.com/package/handlebars.numeral
// npm install --save handlebars.numeral
var NumeralHelper = require("handlebars.numeral")
NumeralHelper.registerHelpers(HB)

// Register Hanldebars 'switch' and 'case' helpers
// http://chrismontrois.net/2016/01/30/handlebars-switch/
HB.registerHelper("switch", function(value, options) {
    this._switch_value_ = value
    var html = options.fn(this) // Process the body of the switch block
    delete this._switch_value_
    return html
})
HB.registerHelper("case", function(value, options) {
    if (value == this._switch_value_) {
        return options.fn(this)
    }
})

// Register Handlebars form-select helper
HB.registerHelper('select', function(selected, options) {
    return options.fn(this).replace(
        new RegExp(' value=\"' + selected + '\"'),
            '$& selected="selected"')
})

// Register Handlebars comparison helper
// See also  https://stackoverflow.com/questions/8853396/logical-operator-in-a-handlebars-js-if-conditional
HB.registerHelper('ifCond', function (v1, operator, v2, options) {
    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this)
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this)
        case '!=':
            return (v1 != v2) ? options.fn(this) : options.inverse(this)
        case '!==':
            return (v1 !== v2) ? options.fn(this) : options.inverse(this)
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this)
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this)
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this)
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this)
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this)
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this)
        default:
            return options.inverse(this)
    }
})

// HB.registerHelper('ifCond', function(v1, v2, options) {
//     if(v1 === v2) {
//         return options.fn(this)
//     }
//     return options.inverse(this)
// })

// Register the Handlebars group-by package
//npm install --save handlebars-group-by
groupBy = require('handlebars-group-by')
groupBy(HB)

// Register the Handlebars 'moment' package
// Use UI.registerHelper..
//npm install --save moment
//npm install --save moment-timezone
var moment = require('moment')
var tz = require('moment-timezone')

HB.registerHelper('convertDateToLocal', function(datetime, format) {
    if (moment) {
        // See http://momentjs.com/timezone/
        var dt
        dt = moment.tz(datetime, 'America/Los_Angeles')
        dt = moment(dt).add(7, 'hours')
        return dt.format('LLLL')
    }
    else {
        return datetime
    }
})

// ===============================================
// Load Node.js utilities 
// ===============================================
//The querystring module provides utilities for parsing and formatting URL query strings. 
var querystring = require("querystring")

// ===============================================
// Specify port to listen on 
// ===============================================
app.set('port', process.env.PORT || 3000)

// ===============================================
// Load settings
// ===============================================
var settings = require('./settings.js')

// ===============================================
// Enable cookies
// ===============================================
// npm i -S cookie-parser
app.use(require('cookie-parser')(settings.cookieSecret))

// ===============================================
// Save app filter as process variable
// ===============================================
var appFilters = settings.appFilters
//console.log("appFilters", appFilters)
//for(var appFilter of appFilters) {
//    console.log(appFilter)
//}
app.set('appFilters', appFilters)

// ===============================================
// Session Management: Store session in DB (or memory if not DB)
// ===============================================
// npm  i -S express-session
var session = require('express-session')

// ===============================================
// Enable session: memory store
// ===============================================
// npm i -S express-session
console.log("BEGIN memory session store")
app.use(session ({
    resave: false,
    saveUninitialized: false,
    secret: settings.cookieSecret,
}))
console.log("END memory session store")

// ===========================================================================
// ===========================================================================
// ===========================================================================

//
// Middleware
//
app.use(require('body-parser').urlencoded({extended: true}))
// this makes req.body available

// ===========================================================================
// ===========================================================================
// ===========================================================================

//
// Define partials
//
app.use(function(req, res, next){
    if(!res.locals.partials) res.locals.partials = {};
    //res.locals.partials.weatherContext = getWeatherData();
    next();
});

//
// Define routes
//
function authorize(req, res, next){
   return next()
}

// Home
app.get('/', function(req, res){
    res.redirect(303, '/home')
})
var homepage = require('./routes/homepage')
app.use('/home', authorize, homepage)

var load_contest = require('./routes/load-contest')
app.use('/load-contest', authorize, load_contest)

var mark_ballot = require('./routes/mark-ballot')
app.use('/mark-ballot', authorize, mark_ballot)

var list_ballots = require('./routes/list-ballots')
app.use('/list-ballots', authorize, list_ballots)

var export_contest = require('./routes/export-contest')
app.use('/export-contest', authorize, export_contest)

var settings = require('./routes/settings')
app.use('/settings', authorize, settings)

//
// Special routes if page not found or an error occurred
//

// Error page
app.get('/error', function(req, res){
    var err = req.query.err
    res.render('error', {
        err: err
    })
})

// custom 404 page
app.use(function(req, res){
    res.status(404)
    res.render('404')
})

// custom 500 page
app.use(function(err, req, res, next){
    console.error(err.stack)
    res.status(500)
    res.render('500')
})

//
// Listen on the provided port
//
app.listen(app.get('port'), function(){
    console.log( 'Express started on http://localhost:' +
    app.get('port') + ' press Ctrl-C to terminate.' )
})

console.log("***************************************")
console.log("END index.js ", Date(Number(new Date())))
console.log("***************************************")
//process.exit();