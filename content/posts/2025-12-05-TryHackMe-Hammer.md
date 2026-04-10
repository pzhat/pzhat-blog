---
title: Tryhackme Hammer challenge WriteUp 
categories: [pentesting, Web-Exploitation]
tags: [RedTeam, Pentest]
---

# TryHackMe Hammer Web Challenge WriteUp

![image-14](https://hackmd.io/_uploads/S1-1mNlzbl.png)

### Enumeration 

![image-15](https://hackmd.io/_uploads/rJKJXExMZx.png)

Tại đây, mình tiến hành scan và được 2 port đang mở bao gồm : 

- 22/tcp : đây là port SSH
- 1337/tcp : đây là port của một cái http service và cái web app này được host lên bằng apache httpd. Bây giờ mình sẽ truy cập vào trang web.

### Exploitation

![image-16](https://hackmd.io/_uploads/HkmgQNeG-e.png)

Sau khi truy cập web trả về cho mình một trang login. Vấn đề ở đây là mình không hề có account để truy cập vậy nên mình sẽ thử với các gói request qua burp proxy.

![image-18](https://hackmd.io/_uploads/BJVWmEefZx.png)

Kiểm tra request thì ngoài trường cookie ra thì chưa có nhiều điểm đáng chú ý, take note cookie lại.

![image-19](https://hackmd.io/_uploads/rkffX4xGZg.png)

Tại đây, mình thử truy cập vào chức năng reset password và được forward qua `/reset_password.php`. Vấn đề tại đây vẫn là thiếu đi email nên mình sẽ thử inspect source. 

![image-21](https://hackmd.io/_uploads/rkGXQ4gMZg.png)

Sau khi inspect vào souce thì mình để ý có đoạn :

```text 
<!-- Dev Note: Directory naming convention must be hmr_DIRECTORY_NAME -->
```

Có vẻ anh Dev note vào đây trong lúc code app mà quên xoá thì ở đây cái note nói rằng directory sẽ có dạng là `hmr_ABCXYZ` bây giờ mình sẽ tiến hành Fuzzing các directory ở đây.

![image-22](https://hackmd.io/_uploads/ry0Q74xzbx.png)

Tại đây ta có được vài directory : 

```text
css                     [Status: 301, Size: 323, Words: 20, Lines: 10, Duration: 110ms]
images                  [Status: 301, Size: 326, Words: 20, Lines: 10, Duration: 109ms]
js                      [Status: 301, Size: 322, Words: 20, Lines: 10, Duration: 109ms]
logs                    [Status: 301, Size: 324, Words: 20, Lines: 10, Duration: 120ms]
```

Status đều là 301 nên ta sẽ truy cập vào xem từng cái : 

![image-23](https://hackmd.io/_uploads/BJuNm4xzZe.png)

Truy cập vào `hmr_css` thì chỉ có file CSS ngoài ra không có gì đáng chú ý.

![image-24](https://hackmd.io/_uploads/rk0SX4lMbe.png)

Truy cập vào `hmr_images` có file ảnh hình cây búa và lại tiếp tục chẳng có gì.

![image-25](https://hackmd.io/_uploads/S1XUX4xGWg.png)

Đây chưa file JS khá dài và không có thông tin đáng giá.

![image-26](https://hackmd.io/_uploads/By9IQElf-x.png)

Đến với directory là `hmr_logs` có vẻ file log, thường file log sẽ để lộ các credentials nhạy cảm nên mình truy cập vào đọc.

![image-27](https://hackmd.io/_uploads/B1JwmVeGZe.png)

Ở đây, mình có được một cái mail của một user đó là `tester@hammer.thm` bây giờ mình sẽ thử reset password với mail này xem có hợp lệ không.

![image-28](https://hackmd.io/_uploads/SyNPX4lGbl.png)

Tại đây email đã qua bước đầu nhưng vẫn còn xác thực OPT trong vòng 200 giây, với thời gian dài như vậy mình nghĩ ngay tới brute force.

Tại đây mình dùng ffuf brute force OTP.

![image-29](https://hackmd.io/_uploads/ByKwXNgM-x.png)

Ở đây mình dùng `sequence` tạo nhanh một wordlist 10k số từ 0000 > 9999 để tiến hành brute.

```bash
ffuf -w OTP.txt \
-u http://10.49.162.194:1337/reset_password.php \
-X POST \
-d "recovery_code=FUZZ&s=60" \
-H "Cookie: PHPSESSID=ihgkqpmppe65lboqrhrnet7luk" \
-H "X-Forwarded-For: FUZZ" \
-H "Content-Type: application/x-www-form-urlencoded" \
-fr "Invalid" -s
```

![image-30](https://hackmd.io/_uploads/SklO74eGZx.png)

Nó thành công trả về OTP bypass được bây giờ thử nhập vào.

![image-31](https://hackmd.io/_uploads/B1LuXVxGbl.png)

Bypass thành công bây giờ mình tiến hành reset password.

![image](https://hackmd.io/_uploads/BJwF4Nxzbx.png)

Thành công login và có được flag đầu tiên.

Sau khi login ta có một funtion chạy các OS command, lúc đầu mình nghĩ sẽ là CMDi nhưng hoá ra nó block khá nhiều câu lệnh nên phải tìm thêm hướng khác.

![image-33](https://hackmd.io/_uploads/Skm9VEeGbx.png)

Thử với câu lệnh ls thì nó leak ra một danh sách :

```text 
188ade1.key
composer.json
config.php
dashboard.php
execute_command.php
hmr_css
hmr_images
hmr_js
hmr_logs
index.php
logout.php
reset_password.php
vendor
```

Tại đây có một file là `188ade1.key` khả năng sẽ có key quan trọng nên mình thử lệnh cat.

![image-34](https://hackmd.io/_uploads/HyoqV4ef-g.png)

Nó không cho cat nên ta sẽ thử truy cập trực tiếp. Bây giờ truy cập qua `http://10.49.162.194:1337/188ade1.key` nó sẽ download file về bây giờ tiến hành kiểm tra nội dung.

![image-35](https://hackmd.io/_uploads/S1goN4xG-l.png)

Mình có được key, chưa biết mục đích của nó nên ta sẽ tìm hiểu thêm một chút tại web app.

![image-36](https://hackmd.io/_uploads/SkIoNVlfZx.png)

Kiểm tra request, có thể thấy rằng web app sử dụng JWT để validate user mà cái key mình lấy có khả năng chính là secret key của JWT. Nếu đúng ta có thể sử dụng nó để nâng quyền user lên.

![image-37](https://hackmd.io/_uploads/B1nsV4eM-x.png)

Decode JWT token ra, nó hiển thị cho ta các thông tin ở đây, mình để ý trường `kid` có giá trị là `/var/www/mykey.key` khả năng cao cái key này dùng để xác định rằng cái token có bị thay đổi không, và bên cạnh đó role vẫn là `user` nên mình sẽ tạo một payload JWT để có thể biến mình thành admin.

![image-45](https://hackmd.io/_uploads/S1PnNNgzZe.png)

Đây là 3 giá trị chính mà mình thay đổi và thêm vào lý do là vì :

- File 188ade1.key chính là secret mà ứng dụng dùng để verify JWT.

- Khi chỉnh kid trong header để trỏ đến file key, rồi dùng chính key đó để ký lại token, bạn bypass được hạn chế role và chiếm quyền admin.

Và ở đây mình phải dùng chính file `188ade1.key` lấy key, trong đó để tạo ra được valid sign JWT thì nó mới trỏ đến file và nó sẽ xác nhận đúng phần payload được ở đây mình dùng công thức rồi đem vào trong JWT.io sau đó ta sẽ lấy token và inject vào.

![image-46](https://hackmd.io/_uploads/rJTnE4gMWx.png)

Có vẻ ổn rồi bây giờ inject vào thử xem sao.

![image-47](https://hackmd.io/_uploads/SkrpEVlGbl.png)

Thành công thực thi câu lệnh id thứ mà đã bị cấm ở lúc trước bây giờ thì cat file flag ra thôi.

![image-48](https://hackmd.io/_uploads/r1j64Vlzbg.png)

Thành công cat được file flag và tin chắc rằng bây giờ ta đã thành công RCE được web server hoàn thành lab.









