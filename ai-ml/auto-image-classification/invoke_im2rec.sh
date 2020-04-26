#!/usr/bin/env bash
## The process file for image classification data transform to the recordio format
# current directory contains only one zip file

git clone https://github.com/apache/incubator-mxnet.git
source activate amazonei_mxnet_p36
unzip *.zip
mkdir -p train
mkdir -p validation

data_path=$1
echo "data_path: ${data_path}"
train_path=train/
echo "train_path: ${train_path}"
val_path=validation/
echo "val_path: ${val_path}"

python incubator-mxnet/tools/im2rec.py \
  --list \
  --train-ratio 0.8 \
  --recursive \
  $data_path/data $data_path

python incubator-mxnet/tools/im2rec.py \
    --resize 224 \
    --center-crop \
    --num-thread 4 \
    $data_path/data $data_path

mv ${data_path}data_train.rec $train_path
mv ${data_path}data_val.rec $val_path
