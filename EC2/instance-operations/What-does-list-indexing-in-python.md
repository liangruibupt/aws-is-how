It is list indexing, it returns all elements [:] except the last one -1. Similar question here

For example,
```python
>>> a = [1,2,3,4,5,6]
>>> a[:-1]
[1, 2, 3, 4, 5]

It works like this

a[start:end]

>>> a[1:2]
[2]

a[start:]

>>> a[1:]
[2, 3, 4, 5, 6]

a[:end]
Your case

>>> a = [1,2,3,4,5,6]
>>> a[:-1]
[1, 2, 3, 4, 5]

a[:]

>>> a[:]
[1, 2, 3, 4, 5, 6]
```
