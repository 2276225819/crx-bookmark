var $$ = chrome.rumtime || chrome.extension;
function connect(tag){
	$$.onMessage.addListener(function(obj){
		if(obj.req && obj.tag==tag && window[obj.fn]){
			var result = window[obj.fn].apply(null,obj.args);
			(result.then?result:Promise.resolve()).then(function(d){ 
				$$.sendMessage({res:obj.req,tag:obj.tag,result:d});
			},function(e){ 
				$$.sendMessage({res:obj.req,tag:obj.tag,error:e});
			});
		} 
	}); 
	return function(__args__){ 
		var arr = [].concat.apply([],arguments); 
		var obj = {req:Date.now(),tag:arr.shift(),fn:arr.shift(),args:arr}; 
		return new Promise(function(next,error){ 
			$$.sendMessage(obj); 
			$$.onMessage.addListener(function T(data){  
				if(data.res && data.res==obj.req && data.tag==obj.tag){
					if(data.result) next(data.result);
					if(data.error) error(data.error);
				} 
			});  
		});  
	}
}

function autoCache(name,fn){
	return getCacheAsync(name).then(function(data){
		return data || fn().then(function(data){
			return setCacheAsync(name,data);
		})
	}) 
}
function getCacheAsync(name){ 
	return new Promise(function(next,err){  
		var str;
		try {
			str = localStorage[name];
			next(str && JSON.parse(str));    
		} catch (error) {
			delete localStorage[name]; 
			alert('getCacheAsync:'+name+'\n'+str);  
			console.log(error.stack);
			err(error); 
		}
	}) 
}
function setCacheAsync(name,val){  
	return new Promise(function(next,err){
		try {
			if(val=='') delete localStorage[name];
			else localStorage[name] = JSON.stringify(val); 
			next(val);   
		} catch (error) { 
			alert("setCacheAsync:"+name+'\n'+str);  
			console.log(error.stack);
			err(error);
		} 
	}) 
}

function loginAsync(){ 
	function getParam(name,path){ 
		var reg = new RegExp("(^|\\\?|&)"+ name +"=([^&]*)(&|$)");
		var r = (path||window.location.search).substr(1).match(reg);
		if(r!=null)return  unescape(r[2]); return null;
	}
	function getOAuthURL(){  
		var appid = '5488e2a9-2c68-4185-9b04-b5218dcad5c1';
		var scope = 'wl.skydrive wl.skydrive_update wl.signin wl.basic';
        return 'https://login.live.com/oauth20_authorize.srf'
                +'?client_id='+appid
                +'&scope='+scope
                +'&response_type='+'code'   
    }; 
	var url = getOAuthURL(); 
	if(this.chrome) return new Promise(function(next,error){
		var cfg ={  url:url, type:'popup',width:400,height:600,top:0 };
		chrome.windows.create(cfg,function(win){   
			try{
				chrome.windows.update(win.id,{focused:true});  
				var tabid = win.tabs[0].id;  
				new function T(){  
					chrome.tabs.get(tabid,function(d){ 
						try {
							if(!d) 
								return error();
							var code = getParam('code',d.url);
							if(!code)return setTimeout(T,500);  
							chrome.tabs.remove(tabid);
							next(code);  
						} catch (e) {
							error(e);
						} 
					}) 
				}; 
			}catch(e){
				error(e);
			}
		});
	}) 
	if(this.window)return new Promise(function(next){  
		var win = window.open(url,'_newTable','width=1,height=1');
		new function T(){ 
			if(!win.location)return;
			var code = getParam('code',win.location.toString());
			if(!code)return setTimeout(T,1000); 
			setTimeout(function(){
				win.close();
			},100);
			return next(code);
		} 
	}) 
} 
function queryNowTabAsync(){ 
	return new Promise(function(next){
		chrome.tabs.query( {'active':true,'lastFocusedWindow': true}, function(tabs){
			if(tabs && tabs[0] && tabs[0].title)
				next(tabs[0]);
		});  
		chrome.tabs.query( {'active':true}, function(tabs){
			if(tabs && tabs[0] && tabs[0].title)
				next(tabs[0]);
		});   
	}).then(function(tab){
		return ({
			url:tab.url,
			title:tab.title//window.prompt("添加新书签："+url,tabs.title);//EdgeEX不支持 
		}); 
	});
}
function createTokenAsync(code){
	var url = 'https://login.live.com/oauth20_token.srf';
	var appid = '5488e2a9-2c68-4185-9b04-b5218dcad5c1';
	var secret = 'B6vPLrYY2xZ6qhzqpCdhnH2';
	var scope = 'wl.skydrive wl.skydrive_update wl.signin wl.basic'; 
	return new Promise(function(next,err){
		$.ajax({
            url:url,  
            type:"POST",
            data:{
                client_id:appid,   client_secret:secret,
                code:code,  grant_type:'authorization_code'
            },
            contentType:"application/x-www-form-urlencoded",
            dataType:"json", 
        }).then(function(data){
			next(data.access_token); 
		},err);
	})
}
function loadUserAsync(token){ 
	return new Promise(function(next,error){
 		$.ajax('https://apis.live.net/v5.0/me?access_token='+token).then(next,error); 
	});
}
function removeFileAsync(token,upload_location){
	upload_location = upload_location.replace(/\/content\/$/,'');
	return new Promise(function(next,error){ 
		$.ajax({
			url: upload_location +'?access_token='+ token,
			type:'DELETE',
			success:next,error:error,
		}) 
	}).then(function(data){
		setCacheAsync(upload_location,'');
		return data;
	})
 
}
function saveFileAsync(token,upload_location,name,url){ 
	var file = name +'.url'; 
	[/\\\\/g, /\//g, /:/g, /;/g, /\*/g, /</g, />/g, /\|/g, /\?/g].forEach(function(v){
		file = file.replace(v,'');
	}); 
	var text = 'URL='+url; 
	return $.ajax({
		url: upload_location +'?access_token='+ token,
		type:'POST',
		contentType : 'multipart/form-data; boundary=EEEEEEEEEEEEEEEEEEEE',
		processData : false,  
		data:'--EEEEEEEEEEEEEEEEEEEE\r\nContent-Disposition: form-data; name="file"; filename="'+file
			+'"\r\nContent-Type: application/octet-stream\r\n\r\n[InternetShortcut]\r\n'+text
			+'\r\nRoamed=-1\r\n--EEEEEEEEEEEEEEEEEEEE--',
	}).then(function(data){
		setCacheAsync(upload_location,'');
		return data;
	});
}
function loadFileListAsync(token,upload_location){ 
	return new Promise(function(next,error){
		$.ajax(upload_location+"?access_token="+token).then(next,error); 
	}).then(function(json){
		return json.data;
	})
}
function loadContentAsync(token,upload_location){
	return new Promise(function(next,error){
		$.ajax(upload_location+"?access_token="+token).then(next,error); 
	}).then(function(html){
		return html.match(/URL=([^\n]*)/)[1];
	})
}
function saveDirAsync(token,base_dir,name){
	return new Promise(function(next,error){ 
		$.ajax({
			url:base_dir ,type:'POST', 
			headers:{ "Authorization":"Bearer "+token,'Content-Type': 'application/json' },
			data: '{"name":"'+name+'"}',
			error:error,
			success:next,
		})  
	})
}
function loadFavoritesAsync(){   
	return tryTokenAsync(function(token){
		return new Promise(function(next,error){
			var url ="https://apis.live.net/v5.0/me/skydrive?access_token="+ token; 
			$.ajax(url).then(next,error); 
		}).then(function(json){
			var base_url = json.upload_location;
			return loadFileListAsync(token,base_url).then(function(files){  
				for(var k in files) with({item:files[k]})
					if(item.name=='favorites') 
						return item.upload_location;   
				//dir is not exists
				var fdir = base_url.replace(/\/files\/$/,'');
				return createDirAsync(token,fdir,'favorites').then(function(json){
					return json.upload_location;  
				}); 
			})
		}) 
	});
}

function tryTokenAsync(cb){ 
	var error=null;
	function T(){
		if(error){ 
			cAsync('front','htmlcss','box-shadow: 0 0 20px 0 rgba(255, 0, 0, 0.32) inset;'); 
			console.log('token error:'+(error.stack || error.status)+error.statusText); 
		}else{ 
			cAsync('front','htmlcss','box-shadow: 0 0 20px 0 rgba(0, 0, 0, 0.32) inset;'); 
		}
		if(tryTokenAsync.cache)
			return tryTokenAsync.cache; 
		return tryTokenAsync.cache = loginAsync().then(function(code){
			return createTokenAsync(code);
		}).then(function(data){
			cAsync('front','htmlcss','');  
			tryTokenAsync.cache=null;
			return data;
		});
	} 
	return autoCache('token',T).then(cb).catch(function(e){  
		error=e;
		return T().then(function(data){ 
			setCacheAsync('token',data); 
			return data;
		}).then(cb).catch(function(e){
			tryTokenAsync.cache=null; 
		});
	})
}  

function addFileAsync(upload_location,file,url){ 
	return tryTokenAsync(function(token){
		return saveFileAsync(token,upload_location,file,url); 
	}); 
}
function delFileAsync(upload_location){  
	return tryTokenAsync(function(token){
		return removeFileAsync(token,upload_location);
	})  
}
function refreshAsync(upload_location){
	return tryTokenAsync(function(token){
		return loadFileListAsync(token,upload_location).then(function(list){
			setCacheAsync(upload_location,list); 
		});
	})
}

function getFileAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return tryTokenAsync(function(token){
			return loadContentAsync(token,upload_location);
		}) 
	}); 
}
function getFileListAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return tryTokenAsync(function(token){
			return loadFileListAsync(token,upload_location);
		}) 
	}); 
}
function getFavoritesUrlAsync(){ 
	return getCacheAsync('skydriver').then(function(favorites_location){ 
		return favorites_location || loadFavoritesAsync().then(function(favorites_location){
			setCacheAsync('skydriver',favorites_location);
			return favorites_location;
		});
	});
}