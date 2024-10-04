

const unCountryData = require("./modules/unCountries");

const inventoryData = require("./modules/inventoryMgmt");

const authData = require("./modules/auth-service");
// const path = require("path");
const express = require('express');
const app = express();

//引入了一个名为 "client-sessions" 的 Node.js 模块。
//这个模块是用来在 Express.js 应用中管理客户端会话（sessions）的。
//会话是用来在客户端和服务器之间存储状态信息的一种机制，通常用于跟踪用户的登录状态、购物车内容等。
const clientSessions = require("client-sessions");

// const HTTP_PORT = process.env.PORT || 8080;
const HTTP_PORT = process.env.PORT || 443

//express.static('public') 是 Express 中的一个内置中间件，用于处理静态文件。
app.use(express.static('public')); 

app.use(express.urlencoded({ extended: true }));

app.use(clientSessions({
  cookieName: "session", // this is the object name that will be added to 'req'
  secret: "freshProInventoryManageSystemDesignedByJianzhongDing", // this should be a long un-guessable string.
  duration: 10 * 60 * 1000, // duration of the session in milliseconds (10 minutes)
  activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
}));


app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});


function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
  } else {
    next();
  }
}


app.set('view engine', 'ejs');

app.get('/', (req, res) => {
  res.render("home")
});



app.get('/about', (req, res) => {
  res.render("about")
});


app.get("/un/addCountry",ensureLogin, async (req, res) => {
  let regions = await unCountryData.getAllRegions()
  res.render("addCountry", { regions: regions })
});

app.get("/addProduct",ensureLogin, async (req, res) => {

  res.render("addProduct")
});


app.post("/un/addCountry",ensureLogin, async (req, res) => {
  try {
    await unCountryData.addCountry(req.body);
    res.redirect("/un/countries");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }

});


app.get("/un/editCountry/:code",ensureLogin, async (req, res) => {

  try {
    let country = await unCountryData.getCountryByCode(req.params.code);
    let regions = await unCountryData.getAllRegions();
    

    res.render("editCountry", { country, regions });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }

});

app.post("/un/editCountry",ensureLogin, async (req, res) => {

  try {
    await unCountryData.editCountry(req.body.a2code, req.body);
    res.redirect("/un/countries");
  } catch (err) {
    res.render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
});


app.get("/un/deleteCountry/:code",ensureLogin, async (req, res) => {
  try {
    await unCountryData.deleteCountry(req.params.code);
    res.redirect("/un/countries");
  } catch (err) {
    res.status(500).render("500", { message: `I'm sorry, but we have encountered the following error: ${err}` });
  }
})

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

app.get("/un/countries", async (req,res)=>{
  
  let countries = [];

  try{
    if(req.query.region){
      countries = await unCountryData.getCountriesByRegion(req.query.region);
    }else{
      countries = await unCountryData.getAllCountries();
    }
    // console.log("countries[0] in server.js:", countries[0])
    res.render("countries", {countries})
  }catch(err){
    res.status(404).render("404", {message: err});
  }
});



app.get("/un/countries/:ccode", (req,res) => {

  unCountryData.getCountryByCode(req.params.ccode).then((country)=>{
      res.render("country", {country});
  }).catch((err)=>{
      res.status(404).render("404", {message: err});
  });
});

// app.get("/un/countries/region-demo", async (req,res)=>{
//   try{
//     let countries = await unCountryData.getCountriesByRegion("Oceania");
//     res.send(countries);
//   }catch(err){
//     res.send(err);
//   }
// });




app.get('/login', (req, res) => {
  res.render('login',{errorMessage: ""});
});



app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body).then((user) => {
    req.session.user = {
        ID: user.userID,
        email: user.email,
        loginHistory: user.loginHistory,
    };

    res.redirect('/');
  })
  .catch(err => res.render('login', {errorMessage: err, ID: req.body.ID}));
});



// app.post('/register', (req, res) => {
  
//   authData.registerUser(req.body).then(
//     ()=>render('register', {successMessage: "User created"}))
//     .catch((err)=> res.render('register', {errorMessage: err, userName: req.body.userName} ) )

// });
app.get('/register', (req, res) => {
  res.render('register', {errorMessage: '', successMessage:''});
});

// app.post('/register', (req, res) => {
  
//   authData.registerUser(req.body).then(
//     ()=>render('register',))
//     .catch((err)=> console.log(err) )

// });

app.post('/register', (req, res) => {
  
  authData.registerUser(req.body).then(
    ()=>res.render('register', {successMessage: "Succesfully registered!", errorMessage:""}))
    .catch((err)=> res.render('register', {successMessage: "", errorMessage:err, ID: req.body.ID}) )

});


app.post("/addProduct", ensureLogin, async (req, res) => {
  try {
    // 调用 registerNewProduct 函数，传入请求体中的产品数据
    await inventoryData.registerNewProduct(req.body);

    // 如果成功，返回状态码 200 和成功消息
    res.status(200).json({ message: "Product successfully added!" });
  } catch (error) {
    // 如果发生错误，根据错误类型返回不同的响应
    if (error === "Product already existed") {
      res.status(400).json({ error: "Product already exists" });
    } else {
      res.status(500).json({ error: `Error adding product: ${error}` });
    }
  }
});

app.post('/', (req, res) => {
  inventoryData.getProductByKeyWords(req.body.productName).then((products)=>res.render('products', {products})).catch((err)=>{console.log(`err: ${err}`)})

});




app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.use((req, res, next) => {
  app.locals.newPara = "test";
  next(); // 调用 next() 将控制权传递给下一个中间件或路由处理程序
});

app.get('/locals', (req, res) => {
  res.send(app.locals);
});


app.use((req, res, next) => {
  res.status(404).render("404", {message: "I'm sorry, we're unable to find what you're looking for"});
});




//original version in A5 clean
// unCountryData.initialize().then(()=>{
//   app.listen(HTTP_PORT, () => { console.log(`server listening on: ${HTTP_PORT}`) });
// });

inventoryData.initialize().then(()=>console.log("inventory data initialized")).catch((err)=> {console.log(`Err: ${err}`)})

//updated version for A6 
unCountryData.initialize().then(()=>{return authData.initialize()}).then(()=>{
  app.listen(HTTP_PORT, () => { console.log(`server listening on: ${HTTP_PORT}`) });
}).catch((err)=> {console.log(`unable to start server: ${err}`)});


