1. Install the Chinese Fonts Support on SageMaker

```bash
sudo mkdir /usr/shared/fonts/chinese
sudo cp ~/SageMaker/nlp/*.ttf /usr/share/fonts/chinese/
sudo chmod -R 755 /usr/share/fonts/chinese

sudo vi /etc/fonts/fonts.conf
# locate the font list, add
<!-- Font directory list -->

        <dir>/usr/share/fonts</dir>
        <dir>/usr/share/X11/fonts/Type1</dir>
        <dir>/usr/share/X11/fonts/TTF</dir>
        <dir>/usr/local/share/fonts</dir>
        <dir>/usr/share/fonts/chinese</dir>
        <dir>~/.fonts</dir>

fc-cache
fc-list
/usr/share/fonts/dejavu/DejaVuSerif-Bold.ttf: DejaVu Serif:style=Bold
/usr/share/fonts/chinese/chinese.simhei.ttf: SimHei,黑体:style=Regular
/usr/share/fonts/default/Type1/c059016l.pfb: Century Schoolbook L:style=Bold
/usr/share/fonts/dejavu/DejaVuSerif-Italic.ttf: DejaVu Serif:style=Italic
/usr/share/fonts/chinese/SimHei.ttf: SimHei,黑体:style=Regular
```

2. Launch a Conda_Python3 Jupyter Notebook 
- ml.c5.2xlarge instance with 500 GiB local storage
- Conda_Python3 Jupyter Notebook 


