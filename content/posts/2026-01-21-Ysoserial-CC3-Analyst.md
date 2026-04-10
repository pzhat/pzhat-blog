---
title: Ysoserial Common Collections 3 Analyst (CC3)
categories: [pentesting, Web-Exploitation, ysoserial]
tags: [Web, ysoserial]
---

# Ysoserial Common Collections 3 Analyst (CC3)

### Tổng quan

`CC3 (CommonsCollections3)` trong ysoserial là một `gadget chain` dựa trên thư viện `Apache Commons Collections` để kích hoạt hành vi nguy hiểm thông qua `Java deserialization`. Nó dựa vào cách một số lớp trong thư viện có thể được “xâu chuỗi” (chain) để thực thi `logic` ngoài ý muốn khi một đối tượng được `deserialization`.

### SetUp Debug trong IntelliJ

![image](https://hackmd.io/_uploads/By9T0v3rWx.png)

![image](https://hackmd.io/_uploads/BJtJ1O2B-l.png)

Lúc tiến hành setup để có thể debug, phải chú ý rằng CC1 và CC3 đã không còn chạy được sau Java version 8u71, vì sau phiên bản java đó `sun.reflect.annotation.AnnotationInvocationHandler` đã thay đổi và không còn khả dụng. Vì vậy setup đẹp nhất là sử tải `JDK 1.7` kèm theo đó là sử dụng `Ysoserial Commons Collections version 3.1`.

### Các hàm cần có

#### InstantiateTransformer

##### Constructor

```java 
private InstantiateTransformer() {
        super();
        iParamTypes = null;
        iArgs = null;
    }
public InstantiateTransformer(Class[] paramTypes, Object[] args) {
        super();
        iParamTypes = paramTypes;
        iArgs = args;
    }
```

#### Các hàm Transform

```java 
 public Object transform(Object input) {
        try {
            if (input instanceof Class == false) {
                throw new FunctorException(
                    "InstantiateTransformer: Input object was not an instanceof Class, it was a "
                        + (input == null ? "null object" : input.getClass().getName()));
            }
            Constructor con = ((Class) input).getConstructor(iParamTypes);
            return con.newInstance(iArgs);

        } catch (NoSuchMethodException ex) {
            throw new FunctorException("InstantiateTransformer: The constructor must exist and be public ");
        } catch (InstantiationException ex) {
            throw new FunctorException("InstantiateTransformer: InstantiationException", ex);
        } catch (IllegalAccessException ex) {
            throw new FunctorException("InstantiateTransformer: Constructor must be public", ex);
        } catch (InvocationTargetException ex) {
            throw new FunctorException("InstantiateTransformer: Constructor threw an exception", ex);
        }
    }
```

Tại hàm này, tiến hành khởi tạo một đối tượng thông qua Java Reflection.

#### TrAXFilter

##### Constructor

```java 
public TrAXFilter(Templates templates)  throws 
    TransformerConfigurationException
{
    _templates = templates;
    _transformer = (TransformerImpl) templates.newTransformer();
    _transformerHandler = new TransformerHandlerImpl(_transformer);
}
```

Ở đoạn code này ta có đoạn : 

```java 
_transformer = (TransformerImpl) templates.newTransformer();
_transformerHandler = new TransformerHandlerImpl(_transformer);
```

Ở đoạn code đó, nó tiến hành gọi hàm `newTransformer()` đây chính là nơi trigger lên payload. Khi TrAXFilter gọi templates.newTransformer(), luồng xử lý sẽ đi vào bên trong `TemplatesImpl` như sau:

```java 
 public synchronized Transformer newTransformer()
    throws TransformerConfigurationException 
    {
    TransformerImpl transformer;

    transformer = new TransformerImpl(getTransletInstance(), _outputProperties,
        _indentNumber, _tfactory);
    
    if (_uriResolver != null) {
        transformer.setURIResolver(_uriResolver);
    }
    
    if (_tfactory.getFeature(XMLConstants.FEATURE_SECURE_PROCESSING)) {
        transformer.setSecureProcessing(true);
    }
    return transformer;
    }
```

Hàm này không có xử lý hay làm cái gì nhiều, chỉ cần để ý rằng nó gọi đến hàm `getTransletInstance()` ta đi đến hàm đó : 

```java 
private Translet getTransletInstance()
    throws TransformerConfigurationException {
    try {
        if (_name == null) return null;

        if (_class == null) defineTransletClasses();

        // The translet needs to keep a reference to all its auxiliary 
        // class to prevent the GC from collecting them
        AbstractTranslet translet = (AbstractTranslet) _class[_transletIndex].newInstance();
            translet.postInitialization();
        translet.setTemplates(this);
        if (_auxClasses != null) {
            translet.setAuxiliaryClasses(_auxClasses);
        }
        
        return translet;
    }
```

Đây là một hàm quan trọng, nhiệm vụ của nó là biến mảng `byte (_bytecodes)` thành một `Class` và khởi tạo nó. Sau đó là tới nhiệm vụ của hàm `defineTransletClasses()`.

```java 
private void defineTransletClasses()
    throws TransformerConfigurationException {

    if (_bytecodes == null) {
        ErrorMsg err = new ErrorMsg(ErrorMsg.NO_TRANSLET_CLASS_ERR);
        throw new TransformerConfigurationException(err.toString());
    }

        TransletClassLoader loader = (TransletClassLoader)
            AccessController.doPrivileged(new PrivilegedAction() {
                public Object run() {
                    return new TransletClassLoader(ObjectFactory.findClassLoader());
                }
            });

    try {
        final int classCount = _bytecodes.length;
        _class = new Class[classCount];

        if (classCount > 1) {
            _auxClasses = new Hashtable();
        }

        for (int i = 0; i < classCount; i++) {
        _class[i] = loader.defineClass(_bytecodes[i]);
        final Class superClass = _class[i].getSuperclass();

        // Check if this is the main class
        if (superClass.getName().equals(ABSTRACT_TRANSLET)) {
            _transletIndex = i;
        }
        else {
            _auxClasses.put(_class[i].getName(), _class[i]);
        }
        }

        if (_transletIndex < 0) {
        ErrorMsg err= new ErrorMsg(ErrorMsg.NO_MAIN_TRANSLET_ERR, _name);
        throw new TransformerConfigurationException(err.toString());
        }
    }
    catch (ClassFormatError e) {
        ErrorMsg err = new ErrorMsg(ErrorMsg.TRANSLET_CLASS_ERR, _name);
        throw new TransformerConfigurationException(err.toString());
    }
    catch (LinkageError e) {
        ErrorMsg err = new ErrorMsg(ErrorMsg.TRANSLET_OBJECT_ERR, _name);
        throw new TransformerConfigurationException(err.toString());
    }
    }
```

Hàm này có vai trò chịu trách nhiệm chuyển đổi mảng `byte[]` thành `Class<?>` trong JVM.

### Gadget Chain Trigger Flow (Debug-based)

Mặc dù `InstantiateTransformer` chứa logic khởi tạo `TrAXFilter`, nhưng bản thân nó không được gọi trực tiếp. Trong CC3, phương thức `transform()` được kích hoạt gián tiếp thông qua cơ chế `Map` khi đối tượng được `deserialization`.

Cấu trúc của Chain sẽ là như sau : 

```text 
readObject()
 └─ AnnotationInvocationHandler
     └─ invoke()
         └─ LazyMap.get()
             └─ ChainedTransformer.transform()
                 ├─ ConstantTransformer → TrAXFilter.class
                 └─ InstantiateTransformer → new TrAXFilter()
                     └─ TemplatesImpl.newTransformer()
                         └─ defineTransletClasses()
                             └─ payload <clinit> → RCE
```

Bây giờ mình sẽ tiến hành debug.

#### BREAKPOINT 1 – ENTRY POINT DESERIALIZATION

![image](https://hackmd.io/_uploads/rJpgqTnHbg.png)

Tiến hành đặt `breakpoint` tại đoạn `readObject(ObjectInputStream var1)` sau đó trigger payload.

![image](https://hackmd.io/_uploads/Bkroia2H-e.png)

Sau khi chạy lên, biến `var(1)` được gán giá trị là `ObjectInputStream@923`, vẫn chưa có gì mới nhưng ta sẽ để ý vào giá trị `memberValues` sau đó tiếp tục chạy.

![image](https://hackmd.io/_uploads/HynKkA2HWe.png)

![image](https://hackmd.io/_uploads/SymbeR3rWl.png)

Sau khi chạy tiếp bước nữa đến dòng thứ 2, sau khi thực hiện `readObject` và gán giá trị cho var 1 thì bây giờ biến `memberValues` đã gọi đến `LazyMap`, cùng với đó là tại biến `type` nó đã gọi đến `java.lang.Override` hay `Override.class`, 2 điều trên chứng mình rằng gadget đầu tiên đã tiến hành `deserialize` và gọi tới `LazyMap(payload)`, đây chính là nơi khởi đầu.

#### BREAKPOINT 2 – PROXY TRIGGER 

![image](https://hackmd.io/_uploads/rypfkkpSWl.png)

Tại breakpoint thứ 2, ta thấy quá trình `deserialization` đã kích hoạt lời gọi tới một đối tượng `Proxy`. Nguyên nhân là trong `readObject()` (breakpoint 1), phương thức `memberValues.entrySet()` được gọi. Tuy nhiên, `memberValues` không phải là một `Map` thông thường mà là một `LazyMap` được `wrap` bởi `java.lang.reflect.Proxy`. Do đó, khi một `method` của `Map` (ví dụ entrySet() hoặc các method liên quan) được gọi trên đối tượng này, `JVM` sẽ chuyển hướng lời gọi đó tới phương thức `invoke()` của `InvocationHandler`, cụ thể là `AnnotationInvocationHandler.invoke()`.

#### BREAKPOINT 3 – memberValues.get()

![image](https://hackmd.io/_uploads/rk-2HkTSWe.png)

Tại breakpoint thứ 3, giá trị `var4` được xác định là "annotationType" và được sử dụng làm `key` trong lời gọi `memberValues.get(var4)`. Tuy nhiên, `memberValues` không phải là một `Map` thông thường mà là một `LazyMap`. Do đó, khi phương thức `get()` được gọi với `key` chưa tồn tại, `LazyMap` sẽ kích hoạt `factory.transform(key)`. Trong `CC3`, `factory` chính là `InstantiateTransformer`, từ đó dẫn đến việc khởi tạo `TrAXFilter`. Quá trình này tiếp tục gọi `TemplatesImpl.newTransformer()`, nơi `bytecode` độc hại được `load` và thực thi, dẫn tới `Remote Code Execution`. `Proxy` trong `chain` chỉ đóng vai trò kích hoạt `InvocationHandler.invoke()`, còn RCE thực sự xảy ra tại thời điểm `LazyMap.get()` gọi `transform()`.

#### BREAKPOINT 4 – CHAINED TRANSFORMER EXECUTION

![image](https://hackmd.io/_uploads/BJTY-6TSbg.png)

Tại `breakpoint 4`, luồng thực thi đi vào `ChainedTransformer.transform()`.
Đây là điểm trung tâm của CC3, nơi các `transformer` được thực thi tuần tự.
`ConstantTransformer` trả về `TrAXFilter.class`, sau đó `InstantiateTransformer` sử dụng `reflection` để khởi tạo đối tượng `TrAXFilter` với tham số `TemplatesImpl`.
Trong quá trình khởi tạo, `constructor` của `TrAXFilter` gọi `TemplatesImpl.newTransformer()`, dẫn đến việc load và thực thi bytecode độc hại, từ đó gây ra `Remote Code Execution`.

Từ đây, luồng xử lý không còn thuộc Commons-Collections nữa, mà chuyển sang:

```text 
TemplatesImpl.newTransformer()
 └─ getTransletInstance()
     └─ defineTransletClasses()
         └─ defineClass(bytecode)
             └─ <clinit> → Runtime.exec()
```

#### BREAKPOINT 5 – Runtime.exec()

![image](https://hackmd.io/_uploads/ByvzFpTHZx.png)

Sau khi TemplatesImpl load class độc hại thông qua `defineClass(byte[])`, JVM tự động thực thi `static initializer <clinit>` của `class` này. `Payload` của `ysoserial` được nhúng trong `<clinit>`, dẫn tới lời gọi `Runtime.getRuntime().exec()`. Tại thời điểm này, mã lệnh hệ điều hành `(calc.exe)` được thực thi, chứng minh `Remote Code Execution` thành công.