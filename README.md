# BASE64格式訂閱連結編輯器 (小火箭訂閱鏈接編輯器)
一個可以生成和修改ShadowRocket (iOS)、v2rayNG (Android)訂閱連結的工具。

## 網址
<https://www.phlinhng.com/b64-url-editor>

## 支持的協議
+ [v2Ray](https://www.v2ray.com/index.html) (`vmess://...`)：支持TCP、WS、KCP三種連接方式
+ [Trojan-GFW](https://github.com/trojan-gfw/trojan) (`trojan://...`)
+ [Shadowsocks](https://en.wikipedia.org/wiki/Shadowsocks) (`ss://...`)：支持所有加密方式

## 功能
1. 導入格式：訂閱連結、節點列表、BASE64文本
2. 修改節點名稱、服務器地址、加密方式(ss)、密碼(ss,trojan)、連接方式(v2ray)、TLS(v2ray)、WS域名與路徑(v2ray)等
3. 新增、刪除節點
4. 合併節點列表
5. **生成二維碼**
6. **生成訂閱鏈接**
7. 當BASE64轉換器用

## 用法
### 手動導入訂閱鏈接
在API欄位中輸入訂閱鏈接，目前只支持導入一個
### 手動添加節點列表
在API或TEXT欄位中輸入節點網址列表，支持添加多個節點，不同節點間使用換行(`\n`)、逗號(`,`)或分號(`;`)隔開。
### 手動添加BASE64密文
在BASE64欄位中輸入BASE64文本。
### URL Query導入訂閱鏈接
```
https://www.phlinhng.com/b64-url-editor?sub=[your subscrption links]
```
設置`qrcode=yes`可以自動顯示二維碼
```
https://www.phlinhng.com/b64-url-editor?sub=[your subscrption links]&qrcode=yes
```
### 生成訂閱鏈接
1. 按`訂閱鏈接`，會出現生成確認，點擊確認繼續生成步驟
2. 輸入ID和密碼，之後每次輸入相同的ID與密碼組合可以更新之前的鏈接內容

### 生成訂閱鏈接注意事項
1. ID和密碼不需認證，只要你覺得好記就行，亂打也是可以的。
2. 目前沒有設計密碼找回機制，若忘記密碼請直接換一組新的。
3. ID可以重複，相同ID不同密碼會生成不同鏈接。

### 單純BASE64轉換
**文字轉BASE64 (encoding)**：URL欄位輸入任意文字，切換至BASE64欄位即可看到轉換結果。
**BASE64轉文字 (decoding)**：BASE64欄位輸入密文，切換至URL欄位即可看到轉換結果。

## known issues
+ clipboard content only loaded once, need to add a listener for clipboard changes
+ adding a new shadowsocks profile may change the height of `operateTab`

## todo
+ [x] 新增節點
+ [x] 生成QR Code
+ [x] 生成訂閱鏈接 (需要api與服務器)
+ [x] 完善URL Query
+ [ ] 完善一鍵粘貼
+ [ ] 調換節點順序
+ [ ] 多個訂閱連結合併
+ [x] 完成README.md
+ [ ] 寫一篇博客文章
