const express = require('express');
const router = express.Router();

router.get('/',(req,res,next)=>{
    res.status(200).render('index',{
        path: '/',
        role: req.session.user ? req.session.user.role : null  ,
        isAuthenticated: req.session.isLoggedIn
    });
});

module.exports = router;