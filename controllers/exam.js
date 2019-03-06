const _ = require('lodash');
const Category = require('../models/category');
const Question = require('../models/question');
const Exam = require('../models/exam');
const {
    validationResult
} = require('express-validator/check');

const ITEMS_PER_PAGE = 10;

const SCORE_PER_QUESTION = 1;
const PENALTY_PER_STEM = .04;

module.exports.examGet = async(req,res,next)=>{
    let msg = req.flash('error');
    if (msg.length > 0){ 
        msg = msg[0];
    } else  {msg= null}

    const errors = validationResult(req); // getting validation error
    // check if any validation error present
    if (!errors.isEmpty()) {
        console.log(errors.array());
        res.status(200).render('user/examCategory',{
            path: '/user/exam',
            errorMessage: errors.array()[0].msg
        });
    }

    const page = +req.query.page || 1;
    let questionCategoryId = req.query.questionCategory;
    if(questionCategoryId){
        let hasPreviousAttempt = false;
        let totalQuestionList = await Question.find({category: questionCategoryId}).countDocuments();
        let questionList = await Question.find({category: questionCategoryId},{text: 1,type: 1, 'stemBody.stems': 1}).skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);

        if(questionList.length >0){
            if(!req.session.examIds){//has user already started exam??--> No; has any previous attempt for it??
                let attemptData;
                const [userExamProfile] = await Exam.find({user: req.session.user._id});
                if(!userExamProfile){// if previous attempt is not present; then, create a new Exam model
                    const freshExam = new Exam({
                        user: req.session.user._id,
                        exams: {
                            _id: questionCategoryId
                        }
                    });
                    await freshExam.save(); 
                } else if(  attemptData = userExamProfile.exams.find(e=> e.id === questionCategoryId)){//// or update the Exam attempt data 
                    hasPreviousAttempt = !attemptData.submitStatus; //submit status means: is user submitted ??
                     // if no, then its value is false that causes hasPreviousAttempt value true
                    await Exam.updateOne({$and: [{'exams._id': questionCategoryId},{user: req.session.user._id}]}, {
                        $inc: {'exams.$.attemptNumbers': 1}, $set: {'exams.$.lastAttemptTime': Date.now(), 'exams.$.submitStatus': false}
                    });
                }
                req.session.examIds = [questionCategoryId]// now  create a new exam session 

                
            } else{// yes i have already created an exam session
                if( !req.session.examIds.includes(questionCategoryId)){// check whether the session exam is old or new one 
                    req.session.examIds.push(questionCategoryId);// create another new exam session for new exam
                }
                
            }
            
            return res.status(200).render('user/exam',{
                path: '/user/exam',
                hasPreviousAttempt,
                questionCategoryId,
                questionList,
                totalQuestionList,
                ITEMS_PER_PAGE,
                currentPage: page,
                hasNextPage: page * ITEMS_PER_PAGE < totalQuestionList,
                hasPreviousPage: page > 1,
                nextPage: page + 1,
                previousPage: page - 1,
                lastPage: Math.ceil(totalQuestionList / ITEMS_PER_PAGE)
            });
        }
    }

    let parentCategoryId = req.query.category;
    if(parentCategoryId){
        let parentCategory = await Category.findById(parentCategoryId);
        let childCategory = await Category.find({parentId: parentCategoryId},{slug: 0, parentId: 0});
        let questionTotalNum = await Question.countDocuments({category: parentCategoryId});
        if(!childCategory.length > 0 && !questionTotalNum > 0){
            return res.render('user/examCategory',{
                path: '/user/exam',
                errorMessage: 'Ops, Sorry no content is here'
            });
        }
        if(childCategory.length > 0 || questionTotalNum > 0){
            return res.render('user/examCategory',{
                path: '/user/exam', 
                parentCategory,
                categoryList: childCategory, 
                questionTotalNum,parentCategoryId
            });
        }
    }
    
    //
    let categoryList = await Category.find({$and: [{parentId: null},{name: {$nin: ['demo','Demo','Others']}}] } ,{slug: 0, parentId: 0}).sort({order:1});
    //let categoryList = await Category.find({parentId: {$and: [null,{$nin: ['demo','Demo']}]}},{slug: 0, parentId: 0}).sort({order:1});
    if(! categoryList.length > 0){
        req.flash('error', 'No Category yet created');
        return res.render('user/examCategory',{errorMessage: msg});
    }

    res.status(200).render('user/examCategory',{
        path: '/user/exam',
        categoryList,errorMessage: msg
    })

}

module.exports.examPost = async(req,res,next)=>{
    const questionCategoryId= req.query.questionCategory;
    let questionList =  req.body.questionList;

    const errors = validationResult(req); // getting validation error
    // check if any validation error present
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return res.status(200).json({error: errors.array()[0].msg});
    }

    if(questionList ){
        
        questionList = _.filter(questionList, obj=> obj.answers );
        if(!questionList.length > 0){
            await Exam.updateOne({$and:[{'exams.id': questionCategoryId},{user: req.session.user._id}]},{$set: {'exams.$.submitStatus': true}});
            return res.status(200).json({feedback: 'You tried nothing'});
        }
        questionList = _.sortBy(questionList, o=> o.id);
        
        questionList.forEach((element)=>{// dif
            if(element.type === 'sba'){
                element.answers = SbaManipulator.getValue(element);
            } else if(element.type === 'matrix'){
                element.answers = MatrixManipulator.mapKeys(element);
            }
            
        });
        questionIds = _.map(questionList,'id');
        function resultData(type='',answers=[],feedbacks=[],generalFeedbacks=[]){
            this.type = type;
            this.answers = answers;
            this.feedbacks = feedbacks;
            this.generalFeedbacks = generalFeedbacks;
            this.score = 0;
        }
        const resultDataArray = []; 
        const questionListToCheck = await Question.find({_id: {$in: questionIds}});
        if(questionListToCheck.length > 0){
            questionListToCheck.forEach((element,index)=>{
                let result = new resultData(element.type,[],element.stemBody.feedbacks,element.stemBody.generalFeedbacks);
                if(element.type === 'sba'){
                    SbaManipulator.getResult(element, index, result, resultDataArray, questionList);
                } else if(element.type === 'matrix'){
                    MatrixManipulator.getResult(element, index, result, resultDataArray, questionList);
                }

            })
            const totalScore = [Number(_.sum(_.map(resultDataArray, o=> o.score)).toFixed(2)), req.body.questionList.length * SCORE_PER_QUESTION];
            const totalScoreParentage = Number((Number((totalScore[0]/totalScore[1]).toFixed(2)) * 100).toFixed(2));
            const [examToUpdateScore] =  await Exam.find({$and:[{'exams._id': questionCategoryId},{user: req.session.user._id}]});

            if(examToUpdateScore){
                examToUpdateScore.exams.forEach(e=>{
                    if(e._id.equals(questionCategoryId)){
                        e.submitStatus= true;
                        e.averageScore= Number(totalScoreParentage);
                    }
                })

                await examToUpdateScore.save();
            }
            //{$set: {'exams.$.submitStatus': true, 'exams.$.averageScore': totalScoreParentage}}

            
            return res.status(200).json({resultDataArray, totalScore, totalScoreParentage});

            //console.log(resultDataArray);
        }

        return res.status(200).json({feedback: 'You tried nothing'});
    }

    return res.status(200).json({error: 'Something wrong. Your answer can not reach to our server'});
}

class MatrixManipulator{
    static mapKeys(element) {
        return _.mapKeys(element.answers, (value,key)=> key.split('_').reverse()[0]);
    }
    static getResult(element, index, result, resultDataArray, questionList){
        resultDataArray.push(result);
        if(element._id.equals(questionList[index].id)){// dif
            let answerIndex = _.keys(questionList[index].answers);
            element.stemBody.answers.forEach((value, dex)=>{
                console.log(questionList[index].answers[dex]);
                if(dex != (answerIndex[dex] ? answerIndex[dex] : -1)){ // just ensure dex will not accidentally gets equal
                    answerIndex.unshift(" ");
                    result.answers.push([false, value]);//(wrong/right , the actual answer value)
                } else{
                    result.answers.push([value === questionList[index].answers[dex] ? true : false, value]);
                }
                //console.log(dex,result.answers);
            })
        }
        const totalAnswerNumber = result.answers.length ;
        const trueAnswerNumber = result.answers.filter(e=> e[0]).length > 0 ? result.answers.filter(e=> e[0]).length : 0 ;
        const falseAnswerNumber = totalAnswerNumber - trueAnswerNumber;
        let scoreVariable = Number( ( (SCORE_PER_QUESTION)/totalAnswerNumber ).toFixed(2) );
        scoreVariable = Number( (scoreVariable * trueAnswerNumber).toFixed(2) );
        scoreVariable = Math.ceil(scoreVariable * 10) / 10 ;
        result.score = Number((scoreVariable - (falseAnswerNumber * PENALTY_PER_STEM)).toFixed(2));
    }
}

class SbaManipulator{
    static getValue(element){
        return _.values(element.answers)[0];
    }
    static getResult(element, index, result, resultDataArray, questionList ){
        resultDataArray.push(result);
        if(element._id.equals(questionList[index].id)){
            if(element.stemBody.answers[0] === questionList[index].answers){
                result.answers = [true, element.stemBody.answers[0]];
            } else{
                result.answers = [false, element.stemBody.answers[0]]
            }

        }
        const totalAnswerNumber = element.stemBody.stems.length ;
        result.score = result.answers[0] ? SCORE_PER_QUESTION : Number((0 - (totalAnswerNumber * PENALTY_PER_STEM)).toFixed(2));; 
    }
}