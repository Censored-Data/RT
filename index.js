const userAgents  =   require('random-useragent');
const rateLimit   =   require("express-rate-limit");
const request     =   require('request');
const mysql       =   require('mysql2');
var app           =   require('express')();
var md5           =   require('md5');
var http          =   require('http').Server(app);
var io            =   require('socket.io')(http);
var port          =   process.env.PORT || 3000;


app.use(function(req, res, next){
   var data = "";
   req.on('data', function(chunk){ data += chunk})
   req.on('end', function(){
      req.rawBody = data;
      next();
   })
})

const limiter = rateLimit({
  windowMs: 1000,
  max: 3,
  message: JSON.stringify({"status" : "error","message": "Вы слишком часто пользуйтесь нашими услугами"})
});


app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const connection = mysql.createConnection({
    host             :  "ip_address",
    user             :  "username",
    password         :  "password",
    database         :  "db_name"
});


const proxyPreset = [
    "http://w3bkCQ:TNSQtY@193.31.102.29:9373",
    "http://w3bkCQ:TNSQtY@193.31.102.24:9750",
    "http://w3bkCQ:TNSQtY@193.31.102.157:9407",
    "http://w3bkCQ:TNSQtY@193.31.103.202:9133",
    "http://w3bkCQ:TNSQtY@193.31.101.253:9919",
    "http://w3bkCQ:TNSQtY@193.31.103.185:9942",
    "http://w3bkCQ:TNSQtY@193.31.100.112:9318",
    "http://w3bkCQ:TNSQtY@193.31.103.98:9924",
    "http://w3bkCQ:TNSQtY@193.31.102.240:9723",
    "http://w3bkCQ:TNSQtY@193.31.101.126:9578",
    "http://hXESFu:T0GtGm@213.166.73.100:9119",
    "http://2jt1k4:WynYDZ@213.166.75.230:9619",
    "http://gzYkf9:WgvWbb@91.188.243.144:9290",
    "http://fd1Kux:fKJ2cY@46.161.20.80:8000"
]


app.get('/', async function(req, res){
  res.sendFile(__dirname + '/index.html');
});


// +----------------------------+
// | Генерация рандомной строки |
// +----------------------------+

function randomString(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

// +---------------------------------------------------------------+
// | Регистрация ключа пользователя для дальнейшего взаимодействия |
// +---------------------------------------------------------------+

app.get('/register_local_user', async function(req, res) {

  res.type('json');

  var user_agent       =  req.header('user-agent');
  var salt             =  randomString(50);
  var localToken       =  md5(user_agent + salt);
  var user_local_data  =  {}

  connection.query("SELECT * FROM local_tokens WHERE local_tokens.t_value = '" + localToken + "'", async function(err, results, fields) {
  if (err) throw err;
  if (typeof results !== 'undefined' || results.length == 0) {
    connection.query("INSERT INTO `local_tokens` (`t_id`, `t_value`, `t_ua`, `t_date`) VALUES (NULL, '" + localToken + "', '" + user_agent + "', CURRENT_TIMESTAMP);", function(err, results, fields) {
      if (err) { console.log(error); } else {
        user_local_data['status']     = 'success';
        user_local_data['localToken'] = localToken;
        res.send(user_local_data);
    }})} else {
        user_local_data['status'] = 'error';
        user_local_data['msg']    = 'Произошла внутренняя ошибка. Локальный токен уже зарегистрирован'
        res.send(user_local_data);
    }
}) });


// +-------------------------------------------------------+
// | Получение сообщений пользователя через локальный ключ |
// +-------------------------------------------------------+

app.get('/get_user_messages', async function(req, res) {

  res.type('json');

  var user_agent   =  req.header('user-agent');
  var localToken   =  req.header('localtoken');
  var response     =  {}

  connection.query("SELECT * FROM local_tokens WHERE local_tokens.t_value = '" + localToken + "'", async function(err, results, fields) {
  if (err) throw err;
  if (typeof results !== 'undefined' && results.length > 0) {
    connection.query("SELECT * FROM messages WHERE messages.m_user_token = '" + localToken + "'", function(err, results, fields) {
      if (err) { console.log(error); } else {
        response['status']     = 'success';
        response['localToken'] = localToken;
        response['messages']   = [];

        results.forEach(function(item, i, arr) {
          response['messages'].push(item);
        });

        res.send(response);

  }})} else {
        response['status'] = 'error';
        response['msg']    = 'Произошла внутренняя ошибка. Локальный токен уже зарегистрирован или его никогда не существовало'
        res.send(response);
  }})});

// +--------------------------------------+
// | Получение синонимов по каждому слову |
// +--------------------------------------+

async function getSynonyms(word) {
return new Promise(async function(resolve) {
var options = {
  method  : 'POST',
  url     : 'https://synonymonline.ru/assets/json/synonyms.json',
  body    : 'word=' + encodeURI(word),
  proxy   :  proxyPreset[Math.floor(Math.random() * proxyPreset.length)],
  headers : {
  	'authority'        : 'synonymonline.ru',
  	'accept'           : '*/*',
  	'x-requested-with' : 'XMLHttpRequest',
  	'user-agent'       : userAgents.getRandom()['userAgent'],
  	'content-type'     : 'application/x-www-form-urlencoded; charset=UTF-8',
  	'origin'           : 'https://synonymonline.ru',
  	'sec-fetch-site'   : 'same-origin',
  	'sec-fetch-mode'   : 'cors',
  	'sec-fetch-dest'   : 'empty',
  	'referer'          : 'https://synonymonline.ru/',
  	'accept-language'  : 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
  } } 

request(options, async function(error, response) {
  if (error) {
    console.log('ERROR', error);
  } else {
    return resolve(JSON.parse(response.body)['synonyms']);
}})})}

async function saveMessageDB(content,localToken,timestamp,from) {
    connection.query("INSERT INTO `messages` (`m_id`, `m_content`, `m_user_token`, `m_timestamp`, `m_from`) VALUES (NULL, '" + JSON.stringify(content) + "', '" + localToken + "', '" + timestamp + "', '" + from + "')", function(err, results, fields) {
      if (err) { console.log(error); }
    });
}

// +--------------------------------------+
// | Получение синонимов по каждому слову |
// +--------------------------------------+

async function fetchSynonyms(data) {
var keywords = '';
return new Promise(async function(resolve) {
    data.forEach(async function(item, i, arr) {
        keywords += (await getSynonyms(item)).join('|');
    })
    console.log(keywords);
    return resolve(keywords);
})}

// +---------------------------------------+
// | Получение к сокетам (прием сообщений) |
// +---------------------------------------+


io.on('connection', async function(socket){

async function EmptyBotResponse(localToken, unix) {
   var bot_response = {
     'from'       :  'system',
     'message'    :  'Переключаем ваш диалог на оператора. Мы уже занимаемся вашим вопросом, ответим в ближайшее время',
   }
  saveMessageDB(bot_response, localToken, unix, 'system');
  io.to(socket.id).emit('chat message', bot_response);
}

socket.on('chat message', async function(msg,localToken){

    var unix = Math.round(+new Date() / 1000);
	
    var user_response = {
    	'from'     : 'own',
    	'message'  : msg,
      'hash'     : md5(randomString(20)),
    	'time'     : new Date().toTimeString().replace(/:[0-9]{2,2} .*/, ''),
      'buttons'  : null,
      'images'   : null
    }

    io.to(socket.id).emit('chat message', user_response);

    saveMessageDB(user_response, localToken, unix, 'user');

    if (msg.includes('Что ты умеешь') || msg.includes('умеешь') || msg.includes('могешь') || msg.includes('способен')) {

    var bot_response = {
    	'from'       : 'bot',
    	'message'    : 'Здравствуйте.У вас возникли вопросы? Мы с удовольствием ответим!',
      'hash'       :  md5(randomString(20)),
    	'time'       :  new Date().toTimeString().replace(/:[0-9]{2,2} .*/, ''),
    	'username'   : 'Поддержка',
    	'avatar'     : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAA1VBMVEXx9PZ4AP//TxLy9vZtAP/n4vfx+Pv2wbX/QgD0+fb4//VzAP//RgD7TBHy8/a0HQbcNwzyRhDDp/qHNf7oPw7j3PezHADJKwnfOQ3uRA/RMAvl3/ixGwa7IQeHNv6GMP6AB+azCQDBT0O+IwD8cUzJKwDTMgDBpPrazfjg1/jHrfnUxPiMPf3KsvmtgPuUUP3q5/fQVkTLHwDYKQDiXkblMwDybE18B/S7KHWME9mRFNB+CfCpefzYN0GWY/+2AJTMwP++ULbvNBT9Zj3oxtLxurj01s+btbN4AAAD8klEQVR4nO3ci1LaQACFYSBoTVYEKzWAIigVa0tb7c3W2tr7+z9Sc1mQS0Kymzjs2Tn/+AB8c5Jdh3GsVBhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4yl5jqb/gSPnHfxwt30Z3jUvIu6uLSZ6D2tV6s2EyNgQHxmK1ECA+KRncQZ0NYV54B2rrgAtHHF4JqoLmTbiksL2rdiAtAuYiLQpgc1BWjPiqlAW1ZcA7RjxbVAG1bMAOKvmAlEJ+YAYj+ouYDIK+YE4q6YG4i6ogIQc0UlIOKKikA8ovdSEYj2oLqvlIFYKzpbGkCoFb2J0BHirOiqnjJoKzqupg9mRf0JUYjeRB8I8aBqHqRAK7qviwnNX9F9o3dV4KzovS0qNH1Fb1AUGHRlMNFxSgBWq1sGE/cKHjQyg1csSWjuis5VSUJjVyx64c9l6IolCqtbRv4NXIlCMfE2rUmqPKEYbNqSXGlCcVAx8iEtTWgssCyhGOwZCixJKAaOqcByhOLA2AXLEYoTg4FlCINrwmBgCUKT38GwwkJzrwlZ4a/aTD5kogoKDX8Hw4oJjX9EKwWF4sR8YCGh+e9gWAGh6deETF8oDiCA+kKzf1WbS1eIcIrG6f6Vgvn34DQ9Ic6CmkKMa0KmIzT4K4uENIQg9+A0dSHMNSFTFiIdMlGqQqx3MExRCLegqhDqmpApCRGBSkKwa0KmIIRcUEWIdg9Oyy3EuyZkeYWY72BYTiHgPTgtnxD0kInKJcR9RCv5hLCHTFQOIcQ32+llC5HfwbBMIfQ7GJYlBL4mZBlC9Ee0kiXEXzBDCPTNdnrrhODXhGyNUAzh38GwNcLh6dn2pj9eCaULh4eHp2cWjJgqDIDHTRuIacIQeGwFMUUYLdgMfvDfxWRhBAw3bPbhV0wUxo9o4Gv2+/3RNTYxSSjfwdjn+++uoR/UBGEAbDZjX9/3/V7v/Qdk4qpQAme+Vqvz8RMwcUU4HB1K30j62u0uMnFZOByNln3t7v7+Di5xSRgA+6u+/UZj9zkqcUEoJHDq60x9DWDivFACI18v9nWlr1GroRLnhBFwNPIfDpg5Xw2W+CAUw/OI5yfsVwMmzoQB8NxP3Q+YOBXGwN46HyhRCiNgb/GCWPFhEmOhGI7HOXyQxEgYA5cuwCQfIjES3ozHrSVfGhCPGArF506+/TCJ4X/+6Kw9QNGJ3o340m7FA+bywRHdO3HbngNm+9CIzmX9a3cGzOVDI3p39W9dRSAW0XEntw1VIBax4n6/31UFYhEd78fPXzvq/d70B1fIdY/+/H2i3D+cFYMdtzXa9IdmjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYy+4/RSRpe6TUOMMAAAAASUVORK5CYII=',
        'buttons'  : [
          {'title' : 'Расскажите о бонусах'},
          {'title' : 'У меня технический вопрос'},
          {'title' : 'У меня вопрос по оплате'},
        ],
        'images'   : null
        }   

    	io.to(socket.id).emit('chat message', bot_response);

      saveMessageDB(bot_response, localToken, unix, 'bot');

      } else if (msg.includes('У меня технический вопрос') || msg.includes('У меня возникли трудности') || msg.includes('У меня проблемы') || msg.includes('Проблемы')) {
            var bot_response = {
                'from'        : 'bot',
                'message'     : 'В какой сфере у Вас возникли трудности?',
                'hash'        :  md5(randomString(20)),
                'time'        : new Date().toTimeString().replace(/:[0-9]{2,2} .*/, ''),
                'username'    : 'Поддержка',
                'avatar'      : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAA1VBMVEXx9PZ4AP//TxLy9vZtAP/n4vfx+Pv2wbX/QgD0+fb4//VzAP//RgD7TBHy8/a0HQbcNwzyRhDDp/qHNf7oPw7j3PezHADJKwnfOQ3uRA/RMAvl3/ixGwa7IQeHNv6GMP6AB+azCQDBT0O+IwD8cUzJKwDTMgDBpPrazfjg1/jHrfnUxPiMPf3KsvmtgPuUUP3q5/fQVkTLHwDYKQDiXkblMwDybE18B/S7KHWME9mRFNB+CfCpefzYN0GWY/+2AJTMwP++ULbvNBT9Zj3oxtLxurj01s+btbN4AAAD8klEQVR4nO3ci1LaQACFYSBoTVYEKzWAIigVa0tb7c3W2tr7+z9Sc1mQS0Kymzjs2Tn/+AB8c5Jdh3GsVBhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4yl5jqb/gSPnHfxwt30Z3jUvIu6uLSZ6D2tV6s2EyNgQHxmK1ECA+KRncQZ0NYV54B2rrgAtHHF4JqoLmTbiksL2rdiAtAuYiLQpgc1BWjPiqlAW1ZcA7RjxbVAG1bMAOKvmAlEJ+YAYj+ouYDIK+YE4q6YG4i6ogIQc0UlIOKKikA8ovdSEYj2oLqvlIFYKzpbGkCoFb2J0BHirOiqnjJoKzqupg9mRf0JUYjeRB8I8aBqHqRAK7qviwnNX9F9o3dV4KzovS0qNH1Fb1AUGHRlMNFxSgBWq1sGE/cKHjQyg1csSWjuis5VSUJjVyx64c9l6IolCqtbRv4NXIlCMfE2rUmqPKEYbNqSXGlCcVAx8iEtTWgssCyhGOwZCixJKAaOqcByhOLA2AXLEYoTg4FlCINrwmBgCUKT38GwwkJzrwlZ4a/aTD5kogoKDX8Hw4oJjX9EKwWF4sR8YCGh+e9gWAGh6deETF8oDiCA+kKzf1WbS1eIcIrG6f6Vgvn34DQ9Ic6CmkKMa0KmIzT4K4uENIQg9+A0dSHMNSFTFiIdMlGqQqx3MExRCLegqhDqmpApCRGBSkKwa0KmIIRcUEWIdg9Oyy3EuyZkeYWY72BYTiHgPTgtnxD0kInKJcR9RCv5hLCHTFQOIcQ32+llC5HfwbBMIfQ7GJYlBL4mZBlC9Ee0kiXEXzBDCPTNdnrrhODXhGyNUAzh38GwNcLh6dn2pj9eCaULh4eHp2cWjJgqDIDHTRuIacIQeGwFMUUYLdgMfvDfxWRhBAw3bPbhV0wUxo9o4Gv2+/3RNTYxSSjfwdjn+++uoR/UBGEAbDZjX9/3/V7v/Qdk4qpQAme+Vqvz8RMwcUU4HB1K30j62u0uMnFZOByNln3t7v7+Di5xSRgA+6u+/UZj9zkqcUEoJHDq60x9DWDivFACI18v9nWlr1GroRLnhBFwNPIfDpg5Xw2W+CAUw/OI5yfsVwMmzoQB8NxP3Q+YOBXGwN46HyhRCiNgb/GCWPFhEmOhGI7HOXyQxEgYA5cuwCQfIjES3ozHrSVfGhCPGArF506+/TCJ4X/+6Kw9QNGJ3o340m7FA+bywRHdO3HbngNm+9CIzmX9a3cGzOVDI3p39W9dRSAW0XEntw1VIBax4n6/31UFYhEd78fPXzvq/d70B1fIdY/+/H2i3D+cFYMdtzXa9IdmjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYy+4/RSRpe6TUOMMAAAAASUVORK5CYII=',
                'buttons'     : [
                    { 'title' : 'Интернет' },
                    { 'title' : 'Мобильная связь' },
                    { 'title' : 'Телевидение' },
                    { 'title' : 'Телефон' },
                    { 'title' : 'Видеонаблюдение' },
                ],
                'images': null
            }

            saveMessageDB(bot_response, localToken, unix, 'bot');

            io.to(socket.id).emit('chat message', bot_response);

      } else if (msg.includes('Картинка') || msg.includes('Картинка') || msg.includes('Покажи картинку')) {

            var bot_response = {
                'from'     : 'bot',
                'message'  : 'Держи картинку',
                'hash'     :  md5(randomString(20)),
                'time'     :  new Date().toTimeString().replace(/:[0-9]{2,2} .*/, ''),
                'username' : 'Поддержка',
                'avatar'   : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAA1VBMVEXx9PZ4AP//TxLy9vZtAP/n4vfx+Pv2wbX/QgD0+fb4//VzAP//RgD7TBHy8/a0HQbcNwzyRhDDp/qHNf7oPw7j3PezHADJKwnfOQ3uRA/RMAvl3/ixGwa7IQeHNv6GMP6AB+azCQDBT0O+IwD8cUzJKwDTMgDBpPrazfjg1/jHrfnUxPiMPf3KsvmtgPuUUP3q5/fQVkTLHwDYKQDiXkblMwDybE18B/S7KHWME9mRFNB+CfCpefzYN0GWY/+2AJTMwP++ULbvNBT9Zj3oxtLxurj01s+btbN4AAAD8klEQVR4nO3ci1LaQACFYSBoTVYEKzWAIigVa0tb7c3W2tr7+z9Sc1mQS0Kymzjs2Tn/+AB8c5Jdh3GsVBhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4yl5jqb/gSPnHfxwt30Z3jUvIu6uLSZ6D2tV6s2EyNgQHxmK1ECA+KRncQZ0NYV54B2rrgAtHHF4JqoLmTbiksL2rdiAtAuYiLQpgc1BWjPiqlAW1ZcA7RjxbVAG1bMAOKvmAlEJ+YAYj+ouYDIK+YE4q6YG4i6ogIQc0UlIOKKikA8ovdSEYj2oLqvlIFYKzpbGkCoFb2J0BHirOiqnjJoKzqupg9mRf0JUYjeRB8I8aBqHqRAK7qviwnNX9F9o3dV4KzovS0qNH1Fb1AUGHRlMNFxSgBWq1sGE/cKHjQyg1csSWjuis5VSUJjVyx64c9l6IolCqtbRv4NXIlCMfE2rUmqPKEYbNqSXGlCcVAx8iEtTWgssCyhGOwZCixJKAaOqcByhOLA2AXLEYoTg4FlCINrwmBgCUKT38GwwkJzrwlZ4a/aTD5kogoKDX8Hw4oJjX9EKwWF4sR8YCGh+e9gWAGh6deETF8oDiCA+kKzf1WbS1eIcIrG6f6Vgvn34DQ9Ic6CmkKMa0KmIzT4K4uENIQg9+A0dSHMNSFTFiIdMlGqQqx3MExRCLegqhDqmpApCRGBSkKwa0KmIIRcUEWIdg9Oyy3EuyZkeYWY72BYTiHgPTgtnxD0kInKJcR9RCv5hLCHTFQOIcQ32+llC5HfwbBMIfQ7GJYlBL4mZBlC9Ee0kiXEXzBDCPTNdnrrhODXhGyNUAzh38GwNcLh6dn2pj9eCaULh4eHp2cWjJgqDIDHTRuIacIQeGwFMUUYLdgMfvDfxWRhBAw3bPbhV0wUxo9o4Gv2+/3RNTYxSSjfwdjn+++uoR/UBGEAbDZjX9/3/V7v/Qdk4qpQAme+Vqvz8RMwcUU4HB1K30j62u0uMnFZOByNln3t7v7+Di5xSRgA+6u+/UZj9zkqcUEoJHDq60x9DWDivFACI18v9nWlr1GroRLnhBFwNPIfDpg5Xw2W+CAUw/OI5yfsVwMmzoQB8NxP3Q+YOBXGwN46HyhRCiNgb/GCWPFhEmOhGI7HOXyQxEgYA5cuwCQfIjES3ozHrSVfGhCPGArF506+/TCJ4X/+6Kw9QNGJ3o340m7FA+bywRHdO3HbngNm+9CIzmX9a3cGzOVDI3p39W9dRSAW0XEntw1VIBax4n6/31UFYhEd78fPXzvq/d70B1fIdY/+/H2i3D+cFYMdtzXa9IdmjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYy+4/RSRpe6TUOMMAAAAASUVORK5CYII=',
                'buttons'  : null,
                'images'   : [
                {'thumb'   : 'https://sun9-48.userapi.com/VgbLFWry3gFL0I121CojxFo2K7J3kwMRWAYhXw/ZFWfiNNvSAw.jpg' } 

                ]
            }

            saveMessageDB(bot_response, localToken, unix, 'bot');

            io.to(socket.id).emit('chat message', bot_response);

      } else {

        var user_msg = msg.trim().split(' ');

        await fetchSynonyms(user_msg);

        var keywordsData = msg.trim().replace(/ /g, '|');
        console.log(keywordsData);
        var db_request = 'SELECT * FROM faq WHERE faq.f_question REGEXP "' + keywordsData  + '"';

        connection.query(db_request,
            async function(err, results, fields) {
                if (err) throw err;
                if (typeof results !== 'undefined' && results.length > 0) {

                    var bot_response = {
                        'from'       : 'bot',
                        'message'    :  results[0]['f_answer'],
                        'time'       :  new Date().toTimeString().replace(/:[0-9]{2,2} .*/, ''),
                        'username'   : 'Поддержка',
                        'avatar'     : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAOEAAADhCAMAAAAJbSJIAAAA1VBMVEXx9PZ4AP//TxLy9vZtAP/n4vfx+Pv2wbX/QgD0+fb4//VzAP//RgD7TBHy8/a0HQbcNwzyRhDDp/qHNf7oPw7j3PezHADJKwnfOQ3uRA/RMAvl3/ixGwa7IQeHNv6GMP6AB+azCQDBT0O+IwD8cUzJKwDTMgDBpPrazfjg1/jHrfnUxPiMPf3KsvmtgPuUUP3q5/fQVkTLHwDYKQDiXkblMwDybE18B/S7KHWME9mRFNB+CfCpefzYN0GWY/+2AJTMwP++ULbvNBT9Zj3oxtLxurj01s+btbN4AAAD8klEQVR4nO3ci1LaQACFYSBoTVYEKzWAIigVa0tb7c3W2tr7+z9Sc1mQS0Kymzjs2Tn/+AB8c5Jdh3GsVBhjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4yl5jqb/gSPnHfxwt30Z3jUvIu6uLSZ6D2tV6s2EyNgQHxmK1ECA+KRncQZ0NYV54B2rrgAtHHF4JqoLmTbiksL2rdiAtAuYiLQpgc1BWjPiqlAW1ZcA7RjxbVAG1bMAOKvmAlEJ+YAYj+ouYDIK+YE4q6YG4i6ogIQc0UlIOKKikA8ovdSEYj2oLqvlIFYKzpbGkCoFb2J0BHirOiqnjJoKzqupg9mRf0JUYjeRB8I8aBqHqRAK7qviwnNX9F9o3dV4KzovS0qNH1Fb1AUGHRlMNFxSgBWq1sGE/cKHjQyg1csSWjuis5VSUJjVyx64c9l6IolCqtbRv4NXIlCMfE2rUmqPKEYbNqSXGlCcVAx8iEtTWgssCyhGOwZCixJKAaOqcByhOLA2AXLEYoTg4FlCINrwmBgCUKT38GwwkJzrwlZ4a/aTD5kogoKDX8Hw4oJjX9EKwWF4sR8YCGh+e9gWAGh6deETF8oDiCA+kKzf1WbS1eIcIrG6f6Vgvn34DQ9Ic6CmkKMa0KmIzT4K4uENIQg9+A0dSHMNSFTFiIdMlGqQqx3MExRCLegqhDqmpApCRGBSkKwa0KmIIRcUEWIdg9Oyy3EuyZkeYWY72BYTiHgPTgtnxD0kInKJcR9RCv5hLCHTFQOIcQ32+llC5HfwbBMIfQ7GJYlBL4mZBlC9Ee0kiXEXzBDCPTNdnrrhODXhGyNUAzh38GwNcLh6dn2pj9eCaULh4eHp2cWjJgqDIDHTRuIacIQeGwFMUUYLdgMfvDfxWRhBAw3bPbhV0wUxo9o4Gv2+/3RNTYxSSjfwdjn+++uoR/UBGEAbDZjX9/3/V7v/Qdk4qpQAme+Vqvz8RMwcUU4HB1K30j62u0uMnFZOByNln3t7v7+Di5xSRgA+6u+/UZj9zkqcUEoJHDq60x9DWDivFACI18v9nWlr1GroRLnhBFwNPIfDpg5Xw2W+CAUw/OI5yfsVwMmzoQB8NxP3Q+YOBXGwN46HyhRCiNgb/GCWPFhEmOhGI7HOXyQxEgYA5cuwCQfIjES3ozHrSVfGhCPGArF506+/TCJ4X/+6Kw9QNGJ3o340m7FA+bywRHdO3HbngNm+9CIzmX9a3cGzOVDI3p39W9dRSAW0XEntw1VIBax4n6/31UFYhEd78fPXzvq/d70B1fIdY/+/H2i3D+cFYMdtzXa9IdmjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYy+4/RSRpe6TUOMMAAAAASUVORK5CYII=',
                        'buttons'    :  null,
                        'images'     :  null
                    }

                    io.to(socket.id).emit('chat message', bot_response);
                    saveMessageDB(bot_response, localToken, unix, 'bot');
                } else { EmptyBotResponse(localToken, unix); }
            });
    }
    });
});

// +----------------+
// | Запуск сервера |
// +----------------+

http.listen(port, async function(){
  console.log('Messanger started at port: ' + port);
});