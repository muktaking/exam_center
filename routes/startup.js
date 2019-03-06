const logger = require('../util/winston');

//importing routes
const indexRoute = require('./index');
const adminRoute = require('./admin');
const userRoute = require('./user');
const isAuth = require('../util/isAuth');
const demoRoute = require('./demo.js');

const startup = (app)=>{
    //setting routes
    app.use('/demo', demoRoute);
    app.use('/user', userRoute);
    app.use('/admin', isAuth.isAdmin,adminRoute);
    app.use('/', indexRoute);
    app.use((err,req,res,next)=>{
        console.log(err);
        //logger.log('error', err.message, err);
        let msg = '';
        if(err.path === 'category'){
            msg+= 'Invalid Category. Please try with valid category'
        }
        res.status(500).render('error', {msg});
    })
}

module.exports = startup;