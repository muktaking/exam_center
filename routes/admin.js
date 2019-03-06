const express = require('express');
expressValidator = require('express-validator');
const {
   body,
   query,
   param
} = require('express-validator/check');
const mongoose = require('mongoose');
const categoryController = require('../controllers/admin/category');
const questionController = require('../controllers/admin/question');
const validator = require('../util/validation');


const router = express.Router();

// Category routes
//create
router.get('/category', categoryController.getCategory);
router.post('/category', validator.categoryValidation, categoryController.PostCategory);
//edit
router.get('/editCategory/:id',
   param('id', 'Category is not valid').isMongoId(), categoryController.editCategoryGet);
router.post('/editCategory/:id', validator.categoryValidation, categoryController.editCategoryPost);
//delete
router.get('/deleteCategory/:id',
   param('id', 'Category is not valid').isMongoId(),
   categoryController.deleteCategoryGet);

router.post('/deleteCategory/:id',
   param('id', 'Category is not valid').isMongoId(), categoryController.deleteCategoryPost);


//question 
//add
router.get('/addQuestion', [
   query('qType')
   .toString()
   .trim()
   .escape()
], questionController.questionGet);

router.post('/addQuestion', validator.extractAsObj('answers', /^answer_.{1}$/), validator.questionValidation, questionController.questionPost);
//upload
router.post('/addQuestion/upload',
   body('category', 'category is not valid').isMongoId(), questionController.questionUploadPost);
//edit
router.get('/editQuestion', [
   query('category', 'Category is invalid').isMongoId(),
   query('question', 'question is not valid').isMongoId()
], questionController.editQuestionGet);

router.post('/editQuestion',[
   query('question','Question not Valid').isMongoId()
],
validator.extractAsObj('answers', /^answer_.{1}$/), validator.questionValidation,
questionController.editQuestionPost
);

// delete
router.get('/deleteQuestion',
   query('question','Question not Valid').isMongoId(),
   questionController.deleteQuestionGet
)
router.post('/deleteQuestion',
   query('question','Question not Valid').isMongoId(),
   questionController.deleteQuestionPost
)

module.exports = router;