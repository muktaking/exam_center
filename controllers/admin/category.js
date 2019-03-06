const fs = require('fs');
const path = require('path');
const {
    validationResult
} = require('express-validator/check'); // validating sign up, login data
const Category = require('../../models/category.js');
const Question = require('../../models/question.js');

//controller of category page for creation in case of admin 
module.exports.getCategory = async (req, res, next) => {
    // flash message form redirected page
    let msg = req.flash('error');
    if (msg.length > 0) {
        msg = msg[0];
    } else {
        msg = null
    }

    // try to catch server error
    try {
        const category = await Category.find({}).sort({
            'slug': 1
        }); // fetch data with name property and sort by name in ascending order
        if (!category) { // if no category present
            return res.render('admin/category',{
                path: '/admin/category'
            });
        }
        //function to storing category according to their hierarchy
        let catHierarchy = [];
        category.forEach((element, index, arr) => {
            let childs = arr.filter(e => element._id.equals(e.parentId)); //store child into parent
            if (childs.length > 0) {
                element.childs = childs;
            }
            if (element.parentId === null) {
                catHierarchy.push(element);
            }
        })
        res.status(200).render('admin/category', {
            path: '/admin/category',
            category,
            catHierarchy,
            errorMessage: msg
        });
    } catch (error) {
        console.log(error);
        res.send('An error occurred in server side. We are sorry for this inconvenience');
    }

}

// controller for creating a category
module.exports.PostCategory = async (req, res, next) => {
    let slug;
    let catName = req.body.catName; // category name
    let parentId = req.body.parentCat; // parent category Id
    let catDescribe = req.body.catDescribe;
    const image = req.files.image[0];
    console.log(image.path);
    if(!image){
        req.flash('error', 'Attach file is not an image');
        return res.redirect('/admin/category');        
    }
    const imageUrl = '/'+ image.path;
    const errors = validationResult(req); // getting validation error
    // check if any validation error present
    if (!errors.isEmpty()) {
        console.log(errors.array());
        req.flash('error', errors.array()[0].msg, )
        return res.redirect('/admin/category')
    }

    try {
        if (parentId === 'Top') {
            parentId = null;
            slug = 'Top';
        } else {
            let [matchCategory] = await Category.find({
                _id: parentId
            });
            slug = matchCategory.slug;
        }
        const [matchCategory] = await Category.find({
            name: catName
        });
        if (matchCategory) {
            req.flash('error', 'Category already Present');
            return res.redirect('/admin/category');
        }
        slug = slug + ' / ' + catName
        //create a new category and save in db
        let category = new Category({
            name: catName,
            parentId,
            slug,
            catDescribe,
            imageUrl
        });

        try {

            let result = await category.save();
            return res.redirect('/admin/category');

        } catch {
            res.status(422).send('Something is wrong');
            console.log(error);
        }


    } catch (error) {
        res.status(422).send('Something is wrong');
        console.log(error);
    }

}

// editCategory get request controller
module.exports.editCategoryGet = async (req, res, next) => {
    const catId = req.params.id; // extracting the category's id  

    let msg = req.flash('error');
    if (msg.length > 0) {
        msg = msg[0];
    } else {
        msg = null
    }

    try {
        const [cat] = await Category.find({ // cat = the category to be edited 
            _id: catId
        });
        if (cat) {
            let regex = new RegExp('\.\*\/ ' + cat.name + '\.\*'); // using regex to match who are child of the category
            const category = await Category.find({
                slug: {
                    $nin: regex
                }
            }).sort({
                'slug': 1
            });
            res.status(200).render('admin/editCategory', {
                category,
                cat,
                errorMessage: msg
            })
        }
    } catch (error) {
        console.log(error);
    }

}

//edit category post request controller
module.exports.editCategoryPost = async (req, res, next) => {
    const catId = req.params.id;
    let newCatSlug;
    const editedCatName = req.body.catName;
    const catDescribe = req.body.catDescribe;
    const image = req.files['image'];
    const parentId = req.body.parentCat;
    const errors = validationResult(req); // getting validation error
    // check if any validation error present
    if (!errors.isEmpty()) {
        console.log(errors.array());
        req.flash('error', errors.array()[0].msg, )
        return res.redirect('/admin/editCategory/'+ catId)
    }    
    try {
        const [oldCat] = await Category.find({_id: catId});
        const regex = new RegExp('\.\*\/ ' + oldCat.name + '\.\*');
        let cat = await Category.find({slug: {$in: regex}}).sort({slug: 1});
        console.log(cat);
        let NewParentCat;
        if(parentId !== 'Top'){
            [NewParentCat] = await Category.find({_id: parentId});
        }
        if(cat){
            cat.forEach((element)=>{
                if(element._id.equals(catId)){
                    element.name = editedCatName;
                    element.catDescribe = catDescribe;
                    if(image){
                        element.imageUrl = '/'+ image.path; 
                    }
                    element.parentId = parentId !== 'Top' ? parentId : null;
                    newCatSlug = element.slug = parentId !== 'Top' ?  NewParentCat.slug + ' / ' + editedCatName : 'Top / ' + editedCatName;
                    
                    return;
                }

                element.slug = newCatSlug + element.slug.split(oldCat.name)[1];
            })
            try{
                cat.forEach(async(element)=>{
                    await element.save();
                })
                
                return res.redirect('/admin/category');

            } catch(error){
                console.log(error);
                return res.status(422).send('sorry for inconvenience');
            }
        }
    } catch (error) {
        console.log(error)
    }

}

//delete category get request

module.exports.deleteCategoryGet = (req,res,next)=>{
    const catId = req.params.id;
    res.render('admin/deleteCategory', {catId});
}

//delete category post request controller

module.exports.deleteCategoryPost = async (req,res,next)=>{
    const catId = req.params.id;

    try {
        const [catToDelete] = await Category.find({_id: catId});
        if(catToDelete){
            const regex = new RegExp('\.\*\/ ' + catToDelete.name + ' \/\.\*');
            const childCats = await Category.find({slug: {$in: regex}});
            childCats.forEach( async(element)=>{
                element.parentId = catToDelete.parentId;
                element.slug = element.slug.replace( '/ '+catToDelete.name+' /', '/' );
                try {
                    await element.save();
                } catch (error) {
                    console.log(error);
                }
            });
            image = path.dirname(require.main.filename) + catToDelete.imageUrl;
            fs.unlink(image, (err) => {
                if (err) {
                    console.log(err);
                }
                console.log( image + 'was deleted');
              });
            try {
                await Category.deleteOne({_id: catId});
                //
                const haveAnyQuestion = await Question.findOne({category: catId});
                if(haveAnyQuestion){
                    if(catToDelete.parentId === null){
                        let [checkOthers] = await Category.find({name: 'Others'});
                        if(!checkOthers){
                            checkOthers = new Category({
                                name: 'Others',
                                parentId: null,
                                slug: 'Top / y_Others',
                                catDescribe: 'All other non-categorized topics'
                            })
                            checkOthers = await checkOthers.save();    
                        }
                        await Question.updateMany({category: catId},{$set:{category: checkOthers._id}});
                        return res.redirect('/admin/category');
                    }
                    await Question.updateMany({category: catId},{$set:{category: catToDelete.parentId}});
                    return res.redirect('/admin/category');

                }
                
                //
                return res.redirect('/admin/category');
            } catch (error) {
                console.log(error);
                next(error);
            }
            
        }
        else{
            return res.redirect('/admin/category');
        }
        // question category manipulation will goes here
        // update question category with its parent id
        //const questionList = await Question
        
    } catch(error){
        console.log(error);
    }


}