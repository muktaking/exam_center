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
    let [demoCategory] = await Category.find({name: {$in: ['Demo','demo']}}).limit(1);
    let questionCategoryId = demoCategory ? demoCategory._id : null;
    if(questionCategoryId){

        let totalQuestionList = await Question.find({category: questionCategoryId}).countDocuments();
        let questionList = await Question.find({category: questionCategoryId},{text: 1,type: 1, 'stemBody.stems': 1}).skip((page - 1) * ITEMS_PER_PAGE).limit(ITEMS_PER_PAGE);
        if(questionList.length >0){                
            return res.status(200).render('user/exam',{
                path: '/user/exam',
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
    else{
        return res.status(200).render('user/examCategory',{
            path: '/user/exam',
            errorMessage: 'Ops, Sorry no content is here'
        });
    }

}

module.exports.examPost = async(req,res,next)=>{
    
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
            return res.status(200).json({resultDataArray, totalScore, totalScoreParentage});

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