//importing important modules
const express = require('express');
const app = express();
require('express-async-errors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose'); // connecting database by mongoose
const session = require('express-session'); // session-cookie managing tools
const MongodbStore = require('connect-mongodb-session')(session); // modules storing session to mongodb
const flash = require('connect-flash');
const csurf = require('csurf');
const csurfProtection = csurf();
require('./util/multer')(app);//configure and initiation of multer
var cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();
//const morgan = require('morgan');
//const logger = require('./util/winston'); // winston configuration
const startup = require('./routes/startup');// top level routes 
const dbLink = process.env.MONGODB_LINK;// our mongodb database link

//handling uncaught promise rejection
process.on('unhandledRejection', ex =>{
    throw ex;
});

    // integrating morgan for logging http request
//app.use(morgan('combined', { stream: logger.stream }));

// Setting template engine, public folders
app.set('view engine', 'pug');
app.use(express.static('public'));
app.use('/images',express.static('images'));

app.use(cors())
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
    extended: true
}))
// parse application/json
app.use(bodyParser.json())
// storing session into mongodb
const store = new MongodbStore({
    uri: dbLink,
    collection: 'sessions'
});

//session middleware function to handle session
app.use(session({
    secret: 'Hello why when',
    resave: false,
    saveUninitialized: false,
    store
}));
app.use(flash()); //flash initialization after session
app.use(csurfProtection); // csurf is middled
app.use((req, res, next) => {// local values of app are set
    app.locals.isAuthenticated = req.session.isLoggedIn;
    app.locals.role = req.session.user ? req.session.user.role : null;
    app.locals.csrfToken = req.csrfToken();
    next();
})

//top level routes

startup(app);

//setting up web environment
const PORT = process.env.PORT || 3000;

// starting my app 
mongoose.connect(dbLink, {
    useNewUrlParser: true
}).then(() => {
    console.log('Connected with db');
    app.listen(PORT, console.log('Connected to port: ', PORT));
}).catch(err => {
    console.log('i am inner: ',err);
});
const db = mongoose.connection;
db.on('disconnected', ()=> {
    throw new Error('Connection lost');
})