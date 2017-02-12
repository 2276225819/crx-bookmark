var oauth = new OAuth({
    'auth_url':'https://login.live.com/oauth20_authorize.srf',
    'token_url':'https://login.live.com/oauth20_token.srf',
    //'redirect_url':'https://www.getpostman.com/oauth2/callback',//
    'appid':'5488e2a9-2c68-4185-9b04-b5218dcad5c1',
    'secret':'B6vPLrYY2xZ6qhzqpCdhnH2',
    'scope':'wl.skydrive wl.skydrive_update wl.signin wl.basic', 
});    
chrome.extension.onMessage.addListener(function(args, sender, sendResponse) {
    if(args.write)console.log(args.write);
    if(args.login)oauth.getToken(function(a,b){
        sendResponse([a,b]);
    });  
});

function GET(name,path){ 
     var reg = new RegExp("(^|\\\?|&)"+ name +"=([^&]*)(&|$)");
     var r = (path||window.location.search).substr(1).match(reg);
     if(r!=null)return  unescape(r[2]); return null;
}
function OAuth(opt){     
    var _this=this;
    _this.getOAuthURL=function(){  
        return opt.auth_url
                +'?client_id='+opt.appid
                +'&scope='+opt.scope
                +'&response_type='+'code'  
    };
    _this.getToken=function(success){ //function success(auth,user):null  
        var data = JSON.parse(localStorage['data']||'{}'); 
        if(data && data.access_token){
            testToken(data ,success);
        }else{   
            getCode('new login',success); 
        } 
    }   
    function createToken(code, success  ){  
        $.ajax({
            url:opt.token_url,  
            type:"POST",
            data:{
                client_id:opt.appid,   client_secret:opt.secret,
                code:code,  grant_type:'authorization_code'
            },
            contentType:"application/x-www-form-urlencoded",
            dataType:"json",
            success: function(data){
                testToken(data ,success);  
                localStorage['data'] = JSON.stringify(data);
                _this.data = data; 
            },
            error:function(e){  
                if( e.status == 0 ) return; //�Ƿ��������ش��� 
                setTimeout(function(){
                    getCode('error login '+ e.statusText||e.responseText,success);  
                },1000);
            }
        });  
    }
    function getCode(name,success){ 
        var bgp = chrome.extension.getBackgroundPage();
        var url =  _this.getOAuthURL()
        bgp.openDialog( url ,name, function T(code){  
            createToken(code,success);
        }); 
    }
    function testToken(data,success){
        var token = data.access_token;
        var user = JSON.parse(localStorage['user']||'{}'); 
        if(data && user) 
            success(data,user);  
        $.ajax({
            url:'https://apis.live.net/v5.0/me?access_token='+token,
            success:function(user){
                _this.info = user;
                if(!user) success(data,user); 
                localStorage['user'] = JSON.stringify(user); 
                
                _exlog("...success...") ; 
            },
            error:function(e){  
                if( e.status == 0 ) return; 
                setTimeout(function(){ 
                    delete localStorage['data'] ;
                    getCode( 'expire login '+  e.statusText||e.responseText, success );  
                },1000);
            }
        });  
    }
}
 


 
function _exlog(str){ 
    console.log(str);
}
chrome.extension.getBackgroundPage().log=function(str){ 
    console.log(str);
}  
chrome.extension.getBackgroundPage().openDialog = function(url,title,success){
    _exlog("open1:"+title);
    chrome.windows.create({  url:url, type:'popup',width:400,height:600,top:0 },function(win){   
        chrome.windows.update(win.id,{focused:true});  
        var tabid = win.tabs[0].id; 
        setTimeout(function T(){ 
            _exlog("check:"+title);
            chrome.tabs.get(tabid,function(d){
                if(!d) return;
                var code = GET('code',d.url);
                if(!code)return setTimeout(T,1000); 
                _exlog("stop:"+title);
                chrome.tabs.remove(tabid);
                success(code);  
            }) 
        },1000); 
    }); 
}