 
$(function(){ 
	var $ul = $('#list');  
	getCacheAsync('skydriver').then(function(arr){
		if(arr) render($ul,arr);    
		else getFavoritesAsync().then(function(arr){
			setCacheAsync('skydriver',arr); 
			render($ul,arr);  
		}); 
	},function(error){ 
		console.log(error);
	}); 

	$(document) .on('click','#tool>a',function(){
        chrome.tabs.create({url:'https://onedrive.live.com/',selected:true}); 
    });
});

function render($parent,data){  
    $parent.empty();
	$.each(data,function(i,item){
		var $li = $('<li></li>').appendTo($parent) ; 
        if(item.type=='folder'){ 
			$li.attr('class','folder');
            var $ul = $('<ul>').appendTo($li); 
            var $title = $('<div>'+item.name+'</div>')
				.prependTo($li) 
            var $new = $('<button class="add" title="添加新书签"></button>')
				.prependTo($li) 
			$new.click(function(){ 
				queryTableAsync().then(function(obj){
					$li.addClass('load');
					$ul.html('<li>加载中...</li>')
					return setFileAsync(item.upload_location,obj.title,obj.url); 
				}).then(function(){
					return getFileListAsync(item.upload_location) 
				}).then(function(list){
					$li.removeClass('load');
					render($ul,list);  
				});
			});
			$title.one('click',function(){  
				if($ul.html()) return $ul.html("");
				$li.addClass('load');
				$('<li>加载中...</li>').appendTo($ul);
				getFileListAsync(item.upload_location).then(function(list){
					$li.removeClass('load');
					render($ul,list);  
				}); 
			}).click(function(){
				$ul.toggleClass('show');
			})
        }      
        if(item.type=='file'){ 
            var name = item.name.replace(/\.url$/,'');
            var $title = $('<div>'+item.name+'</div>')
				.prependTo($li)  
			var $del = $('<button class="del" title="删除书签"></button>')
				.prependTo($li);
			getCacheAsync(item.upload_location).then(function(html){
				return html || new Promise(function(next,err){
					$li.one('mouseover',function(){
						$li.addClass('load');
						next();
					});
				}).then(function(){
					return getFileAsync(item.upload_location)
				}).then(function(html){ 
					$li.removeClass('load');
					return html;
				});
			}).then(function(html){
				$li.attr('class','file');
				$del.click(function(){

				});
				$title.click(function(){
					var src = $(this).data('file');  
					chrome.tabs.create({url:src,selected:true}); 
				}) 
			});
        } 
    });
} 
 
function autoCache(name,fn){
	return getCacheAsync(name).then(function(data){
		return data || fn().then(function(data){
			return setCacheAsync(name,data);
		})
	}).catch(function(e){
		localStorage['token']='';
		alert(e.stack ||e.status);
	})
}
function getCacheAsync(name){
	var global = this;// (0,eval)('this');
	return new Promise(function(next,err){ 
		if(global.localStorage){
			var str = localStorage[name];
			next(str && JSON.parse(str)); 
		}else{
			err("!!getCacheAsync!!");
		}
	}) 
}
function setCacheAsync(name,val){ 
	var global = this;//(0,eval)('this');
	return new Promise(function(next,err){
		if(global.localStorage){
			localStorage[name] = val?JSON.stringify(val):val;
			next(val); 
		}else{
			err("!!setCacheAsync!!");
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
	return new Promise(function(next){
		chrome.windows.create({  url:url, type:'popup',width:400,height:600,top:0 },function(win){   
			chrome.windows.update(win.id,{focused:true});  
			var tabid = win.tabs[0].id; 
			setTimeout(function T(){  
				chrome.tabs.get(tabid,function(d){
					if(!d) return;
					var code = getParam('code',d.url);
					if(!code)return setTimeout(T,1000);  
					chrome.tabs.remove(tabid);
					next(code);  
				}) 
			},1000);
		});
	});
	// return new Promise(function(next){  
	// 	var win = window.open(url,'_newTable','width=1,height=1');
	// 	new function T(){ 
	// 		if(!win.location)return;
	// 		var code = getParam('code',win.location.toString());
	// 		if(!code)return setTimeout(T,1000); 
	// 		setTimeout(function(){
	// 			win.close();
	// 		},100);
	// 		return next(code);
	// 	} 
	// }) 
} 
function queryTableAsync(){ 
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
            success: function(data){
				next(data.access_token); 
            },
            error:err
        });  
	})
}
function loadUserAsync(token){ 
	return new Promise(function(next,error){
 		$.ajax('https://apis.live.net/v5.0/me?access_token='+token).then(next,error); 
	});
}
function saveFileAsync(token,upload_location,name,url){ 
	var file = name+'.url'; 
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
		return setCacheAsync(upload_location,'').then(function(){
			return data;
		});
	});
}
function loadFilesAsync(token,upload_location){ 
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
function getFavoritesAsync(){   
	return getTokenAsync().then(function(token){ 
		return new Promise(function(next,error){
			var url ="https://apis.live.net/v5.0/me/skydrive?access_token="+ token; 
			$.ajax(url).then(next,error); 
		}).then(function(json){
			var base_url = json.upload_location;
			return loadFilesAsync(token,base_url) .then(function(files){  
				for(var k in files) with({item:files[k]})
					if(item.name=='favorites') 
						return item.upload_location;   
				//dir is not exists
				var fdir = base_url.replace(/\/files\/$/,'');
				return createDirAsync(token,fdir,'favorites').then(function(json){
					return json.upload_location;  
				}); 
			})
		}).then(function(favorites_location){
			return loadFilesAsync(token,favorites_location);
		})
	});
}


function getTokenAsync(){ 
	return autoCache('token',function(){
		return loginAsync().then(function(code){
			return createTokenAsync(code);
		}) 
	})
}
function setFileAsync(upload_location,file,url){ 
	return getTokenAsync().then(function(token){
		return saveFileAsync(token,upload_location,file,url);
	})  
}
function getFileAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return getTokenAsync().then(function(token){
			return loadContentAsync(token,upload_location);
		}) 
	}); 
}
function getFileListAsync(upload_location){ 
	return autoCache(upload_location,function(){
		return getTokenAsync().then(function(token){
			return loadFilesAsync(token,upload_location);
		}) 
	}); 
}