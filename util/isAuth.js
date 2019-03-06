module.exports.isLoggedIn = (req,res,next)=>{
    if(req.session.isLoggedIn){
        next()
    } else{
        res.redirect('/user/login');
    }
}

module.exports.isAdmin = (req,res,next)=>{
    if(req.session.user ? req.session.user.role === 'admin' : false){
        next();
    } else{
        res.redirect('/');
    }
}