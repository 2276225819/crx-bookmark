 
$(function(){ 
	var $ul = $('#list');  
	var base_url='';   
	getFavoritesUrlAsync().then(function(favorites_location){
		return base_url=favorites_location; 
	}).then(function(favorites_location){
		base_url=favorites_location;
		return getFileListAsync(favorites_location) ;
	}).then(function(arr){ 
		render($ul,arr);   
	},function(error){ 
		alert(error);
		console.log(error);
	});  
	$(document) 
	.on('click','#tool>.title',function(){
        chrome.tabs.create({url:'https://onedrive.live.com/',selected:true}); 
    })
	.on('click','#tool>.add',function(){ 
		if(base_url) queryNowTabAsync().then(function(tab){ 
			$ul.html('<li>加载中...</li>')
			return addFileAsync(base_url,tab.title,tab.url); 
		}).then(function(){
			return getFileListAsync(base_url) 
		}).then(function(list){ 
			render($ul,list);  
		});
	})
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
				queryNowTabAsync().then(function(obj){
					$li.addClass('load');
					$ul.html('<li>加载中...</li>')
					return addFileAsync(item.upload_location,obj.title,obj.url); 
				}).then(function(){
					return getFileListAsync(item.upload_location) 
				}).then(function(list){
					$li.removeClass('load');
					if(list)render($ul,list);  
				});
			});
			$title.one('click',function(){  
				if($ul.html()) return $ul.html("");
				$li.addClass('load');
				$('<li>加载中...</li>').appendTo($ul);
				getFileListAsync(item.upload_location).then(function(list){
					$li.removeClass('load');
					if(list)render($ul,list);  
				}); 
			}).click(function(){
				$li.toggleClass('show');
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
					$li.addClass('load');
					delFileAsync(item.upload_location).then(function(){
						var upload_location = 'https://apis.live.net/v5.0/'+item.parent_id+'/files/';
						setCacheAsync(upload_location,'');
						return getFileListAsync(upload_location);
					}).then(function(list){
						$li.removeClass('load');
						if(list)render($parent,list);  
					});
				});
				$title.click(function(){
					var src = html;  
					chrome.tabs.create({url:src,selected:true}); 
				}) 
			});
        } 
    });
} 
 

// function autoCache(name,fn){
// 	return getCacheAsync(name).then(function(data){
// 		return data || fn().then(function(data){
// 			return setCacheAsync(name,data);
// 		})
// 	}) 
// }
// function loginAsync(){ 
// 	function getParam(name,path){ 
// 		var reg = new RegExp("(^|\\\?|&)"+ name +"=([^&]*)(&|$)");
// 		var r = (path||window.location.search).substr(1).match(reg);
// 		if(r!=null)return  unescape(r[2]); return null;
// 	}
// 	function getOAuthURL(){  
// 		var appid = '5488e2a9-2c68-4185-9b04-b5218dcad5c1';
// 		var scope = 'wl.skydrive wl.skydrive_update wl.signin wl.basic';
//         return 'https://login.live.com/oauth20_authorize.srf'
//                 +'?client_id='+appid
//                 +'&scope='+scope
//                 +'&response_type='+'code'   
//     }; 
// 	var url = getOAuthURL(); 
// 	return new Promise(function(next){
// 		chrome.windows.create({  url:url, type:'popup',width:400,height:600,top:0 },function(win){   
// 			chrome.windows.update(win.id,{focused:true});  
// 			var tabid = win.tabs[0].id; 
// 			setTimeout(function T(){  
// 				chrome.tabs.get(tabid,function(d){
// 					if(!d) return;
// 					var code = getParam('code',d.url);
// 					if(!code)return setTimeout(T,1000);  
// 					chrome.tabs.remove(tabid);
// 					next(code);  
// 				}) 
// 			},1000);
// 		});
// 	});
// 	// return new Promise(function(next){  
// 	// 	var win = window.open(url,'_newTable','width=1,height=1');
// 	// 	new function T(){ 
// 	// 		if(!win.location)return;
// 	// 		var code = getParam('code',win.location.toString());
// 	// 		if(!code)return setTimeout(T,1000); 
// 	// 		setTimeout(function(){
// 	// 			win.close();
// 	// 		},100);
// 	// 		return next(code);
// 	// 	} 
// 	// }) 
// } 

// function createTokenAsync(code){
// 	var url = 'https://login.live.com/oauth20_token.srf';
// 	var appid = '5488e2a9-2c68-4185-9b04-b5218dcad5c1';
// 	var secret = 'B6vPLrYY2xZ6qhzqpCdhnH2';
// 	var scope = 'wl.skydrive wl.skydrive_update wl.signin wl.basic'; 
// 	return new Promise(function(next,err){
// 		$.ajax({
//             url:url,  
//             type:"POST",
//             data:{
//                 client_id:appid,   client_secret:secret,
//                 code:code,  grant_type:'authorization_code'
//             },
//             contentType:"application/x-www-form-urlencoded",
//             dataType:"json", 
//         }).then(function(data){
// 			next(data.access_token); 
// 		},err);
// 	})
// }
// function loadUserAsync(token){ 
// 	return new Promise(function(next,error){
//  		$.ajax('https://apis.live.net/v5.0/me?access_token='+token).then(next,error); 
// 	});
// }
// function removeFileAsync(token,upload_location){
// 	upload_location = upload_location.replace(/\/content\/$/,'');
// 	return new Promise(function(next,error){ 
// 		$.ajax({
// 			url: upload_location +'?access_token='+ token,
// 			type:'DELETE',
// 			success:next,error:error,
// 		}) 
// 	}).then(function(data){
// 		setCacheAsync(upload_location,'');
// 		return data;
// 	})
 
// }
// function saveFileAsync(token,upload_location,name,url){ 
// 	var file = name +'.url'; 
// 	[/\\\\/g, /\//g, /:/g, /;/g, /\*/g, /</g, />/g, /\|/g, /\?/g].forEach(function(v){
// 		file = file.replace(v,'');
// 	}); 
// 	var text = 'URL='+url; 
// 	return $.ajax({
// 		url: upload_location +'?access_token='+ token,
// 		type:'POST',
// 		contentType : 'multipart/form-data; boundary=EEEEEEEEEEEEEEEEEEEE',
// 		processData : false,  
// 		data:'--EEEEEEEEEEEEEEEEEEEE\r\nContent-Disposition: form-data; name="file"; filename="'+file
// 			+'"\r\nContent-Type: application/octet-stream\r\n\r\n[InternetShortcut]\r\n'+text
// 			+'\r\nRoamed=-1\r\n--EEEEEEEEEEEEEEEEEEEE--',
// 	}).then(function(data){
// 		setCacheAsync(upload_location,'');
// 		return data;
// 	});
// }
// function loadFileListAsync(token,upload_location){ 
// 	return new Promise(function(next,error){
// 		$.ajax(upload_location+"?access_token="+token).then(next,error); 
// 	}).then(function(json){
// 		return json.data;
// 	})
// }
// function loadContentAsync(token,upload_location){
// 	return new Promise(function(next,error){
// 		$.ajax(upload_location+"?access_token="+token).then(next,error); 
// 	}).then(function(html){
// 		return html.match(/URL=([^\n]*)/)[1];
// 	})
// }
// function saveDirAsync(token,base_dir,name){
// 	return new Promise(function(next,error){ 
// 		$.ajax({
// 			url:base_dir ,type:'POST', 
// 			headers:{ "Authorization":"Bearer "+token,'Content-Type': 'application/json' },
// 			data: '{"name":"'+name+'"}',
// 			error:error,
// 			success:next,
// 		})  
// 	})
// }
// function loadFavoritesAsync(){   
// 	return tryTokenAsync(function(token){
// 		return new Promise(function(next,error){
// 			var url ="https://apis.live.net/v5.0/me/skydrive?access_token="+ token; 
// 			$.ajax(url).then(next,error); 
// 		}).then(function(json){
// 			var base_url = json.upload_location;
// 			return loadFileListAsync(token,base_url).then(function(files){  
// 				for(var k in files) with({item:files[k]})
// 					if(item.name=='favorites') 
// 						return item.upload_location;   
// 				//dir is not exists
// 				var fdir = base_url.replace(/\/files\/$/,'');
// 				return createDirAsync(token,fdir,'favorites').then(function(json){
// 					return json.upload_location;  
// 				}); 
// 			})
// 		}) 
// 	});
// }

// function tryTokenAsync(cb){ 
// 	return autoCache('token',function(){
// 		return loginAsync().then(function(code){
// 			return createTokenAsync(code);
// 		}) 
// 	})
// 	.then(cb)
// 	.catch(function(e){ 
// 		setCacheAsync('token',''); 
// 		alert('token error:'+(e.stack ||e.status)+ e.statusText); 
// 	})
// } 
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
function chromeCallAsync(arr){
	return new Promise(function(next){ 
		var k = Date.now();
		arr.unshift(k);
    	chrome.extension.sendMessage(arr);    
		chrome.extension.onMessage.addListener(function T(args){ 
			if(args.id == k){ 
				next(args.data);
				chrome.extension.onMessage.removeListener(T);
			}
		});
	});
}
function getCacheAsync(name){  
	return chromeCallAsync(['getCacheAsync',name] ); 
}
function setCacheAsync(name,val){  
	return chromeCallAsync(['setCacheAsync',name,val] ); 
} 
function addFileAsync(upload_location,file,url){ 
	return chromeCallAsync(['addFileAsync',upload_location,file,url] );
}
function delFileAsync(upload_location){  
	return chromeCallAsync(['delFileAsync',upload_location] );
}
function getFileAsync(upload_location){ 
	return chromeCallAsync(['getFileAsync',upload_location] );
}
function getFileListAsync(upload_location){  
	return chromeCallAsync(['getFileListAsync',upload_location] );
}
function getFavoritesUrlAsync(){  
	return chromeCallAsync(['getFavoritesUrlAsync']);
}