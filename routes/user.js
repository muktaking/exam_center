const express = require('express');
const {check,body,query} = require('express-validator/check');
const validator = require('../util/validation');

const router = express.Router();
//importing controllers
const isAuth = require('../util/isAuth');
const userController = require('../controllers/user');
const authController = require('../controllers/auth');
const examController = require('../controllers/exam');
//importing models
const User = require('../models/user');
 

//routing signUp
router.get('/signup',userController.signUpPage);
router.post('/signup',[
    body('username',"Invalid username. Username should be at least 5 alpha-numeric characters")
        .isAlphanumeric()
        .isLength({min: 5})
        .trim()
        .escape(),
    body('email')
        .isEmail()
        .withMessage('Invalid Email')
        .trim()
        .normalizeEmail()
        .custom((value,{req})=>{
            return User.find({email: value})
                .then(userDoc=>{
                    if(userDoc){
                        return Promise.reject('The Email is already exists');
                    }
                })
                .catch(err=>{
                    console.log(err);
                })
        }),
    body('password','Please enter valid password. Password should be at least 5 alpha-numeric characters')
        .isLength({min: 5})
        .isAlphanumeric()
        .trim()
        .escape(),
    body('confirmPassword')
        .trim()
        .escape()
        .custom((value,{req})=>{
            if(value !== req.body.password){
                throw new Error('Password confirmation does not match password')
            }
            return true;
        })    
],userController.saveNewUser);

//routing login 
router.get('/login',authController.getLogin);
router.post('/login',authController.postLogin);
//routing logout
router.post('/logout', authController.postLogOut);
//routing reset
router.post('/reset',authController.postReset);
router.get('/reset/:token',authController.getNewPassword);
router.post('/reset/:token', [
    body('password','Please enter valid password. Password should be at least 5 alpha-numeric characters')
        .isLength({min: 5})
        .isAlphanumeric()
        .trim()
        .escape(),
    body('confirmPassword')
        .trim()
        .escape()
        .custom((value,{req})=>{
            if(value !== req.body.password){
                throw new Error('Password confirmation does not match password')
            }
            return true;
        }) 
] ,authController.postNewPassword);

//routing dashboard

router.get('/dashboard', isAuth.isLoggedIn, userController.dBoardController)

// routing exam
router.get('/exam', isAuth.isLoggedIn,[
    query('questionCategory', 'question category is not in well format').optional().isMongoId().escape(),
    query('page','page number is excess').optional().isLength({min:1,max:2}).escape()
], examController.examGet);
router.post('/exam', isAuth.isLoggedIn, validator.examValidation, examController.examPost);  

module.exports = router;
