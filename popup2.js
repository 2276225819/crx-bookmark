/// <reference path="lib/core.js" />
$(function(){ 
	var $ul = $('#list');  
	var base_url='';   
	getFavoritesUrlAsync().then(function(favorites_location){
		base_url=favorites_location;
		return getFileListAsync(favorites_location) ;
	}).then(function(arr){ 
		render($ul,arr);   
		cAsync('back','refreshAsync',base_url); 
	},function(error){ 
		alert('init error:'+error);
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
            // var $dir = $('<button class="dir" title="添加文件夹"></button>')
			// 	.prependTo($li) 
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
			// $dir.click(function(){

			// });
			$title.one('click',function(){   
				$li.addClass('load');
				$('<li>加载中...</li>').appendTo($ul);
				getFileListAsync(item.upload_location).then(function(list){
					$li.removeClass('load');
					if(list) render($ul,list);   
					cAsync('back','refreshAsync',item.upload_location); 
				}); 
			}).click(function(){
				$li.toggleClass('show');  
			})
        }      
        if(item.type=='file'){ 
            var name = item.name.replace(/\.url$/,'');
            var $title = $('<div>'+item.name+'</div>')
				.prependTo($li).attr('title',item.name);
			var $del = $('<button class="del" title="删除书签"></button>')
				.prependTo($li);
			getCacheAsync(item.upload_location).then(function(html){
				/*new Promise(function(next,err){
					$li.one('mouseover',function(){
						$li.addClass('load');
						next();
					});
				}).then(function(){
					return 
				})*/
				return html || getFileAsync(item.upload_location).then(function(html){ 
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

var cAsync = connect('front');
// function cAsync( __args__ ){ 
// 	var arr = [].concat.apply([],arguments); 
// 	return new Promise(function(next){ 
// 		var k = Date.now();
// 		arr.unshift(k);
//     	$$.sendMessage(arr);  
// 		$$.onMessage.addListener(function T(args){   
// 			if(args.id != k) return;
// 			next(args.data);
// 			$$.onMessage.removeListener(T); 
// 		});  
// 	});
// }

function htmlcss(s){
	$('html').attr('style',s);
}
function addFileAsync(upload_location,file,url){ 
	return cAsync('back','addFileAsync',upload_location,file,url );
}
function delFileAsync(upload_location){  
	return cAsync('back','delFileAsync',upload_location );
}
function getFileAsync(upload_location){ 
	return cAsync('back','getFileAsync',upload_location );
}
function getFileListAsync(upload_location){  
	return cAsync('back','getFileListAsync',upload_location );
}
function getFavoritesUrlAsync(){  
	return cAsync('back','getFavoritesUrlAsync');
} 