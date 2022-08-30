# How to use the SM key spec in China region KMS

The HSMs used in the Amazon Web Services China (Beijing) Region and the Amazon Web Services China (Ningxia) Region are approved for use by the Chinese government. https://www.amazonaws.cn/en/kms/features/

## I want to set the AWS KMS CMK by using China SM algorithm key spec

Asymmetric KMS keys contain an RSA key pair, Elliptic Curve (ECC) key pair, or an SM2 key pair (China Regions only). KMS keys with RSA or SM2 key pairs can be used to encrypt or decrypt data or sign and verify messages (but not both). 

 The default value of key-spec is SYMMETRIC_DEFAULT , creates a KMS key with a 256-bit AES-GCM key that is used for encryption and decryption, except in China Regions, where it creates a 128-bit symmetric key that uses SM4 encryption. 

1. You can create key with SM algorithm on AWS China Beijing console to using the SM algorithm key spec

2. You can also create key with SM algorithm with CLI
```
aws kms create-key --key-usage ENCRYPT_DECRYPT --key-spec SM2 \
    --tags TagKey=Purpose,TagValue='Test SM' --description "Test SM key" \
    --region cn-north-1 --profile china_ruiliang

aws kms create-alias --alias-name alias/ray/asymmetric/sm2/testcmk \
    --target-key-id 99091e53-21fe-4751-bc67-3c3f1c48bce2 --region cn-north-1 --profile china_ruiliang
```

2. Verify the CMK is using SM algorithm key spec
```bash
aws kms describe-key --key-id alias/ray/asymmetric/sm2/testcmk --region cn-north-1 --profile china_ruiliang | jq '.KeyMetadata.EncryptionAlgorithms, .KeyMetadata.CustomerMasterKeySpec, .KeyMetadata.KeySpec'
 
[
  "SM2PKE"
]
"SM2"
"SM2"
```

## I want to set the AWS KMS data key by using China SM algorithm key spec
 
1. To create the basic KMS key, a symmetric encryption key, you do not need to specify the key-spec or key-usage parameters. 
```bash
aws kms create-key --tags TagKey=Purpose,TagValue='Test SM data key' --description "Test SM data key" \
    --region cn-north-1 --profile china_ruiliang

aws kms create-alias --alias-name alias/ray/symmetric/sm/testdatakey \
    --target-key-id b6d41575-3c3d-41b4-969d-0d73da32f35d --region cn-north-1 --profile china_ruiliang
```

2. Then I generate the data-key
Based on the [KMS CLI doc](https://docs.aws.amazon.com/cli/latest/reference/kms/generate-data-key.html)

Note: To generate an SM4 data key (China Regions only), specify a KeySpec value of AES_128 or NumberOfBytes value of 128 . The symmetric encryption key used in China Regions to encrypt your data key is an SM4 encryption key.

Note: To generate a data key, specify the symmetric encryption KMS key that will be used to encrypt the data key. You cannot use an asymmetric KMS key to encrypt data keys. 

```bash
aws kms generate-data-key --key-id alias/ray/symmetric/sm/testdatakey --key-spec AES_128 --encryption-context project=workshop --region cn-north-1 --profile china_ruiliang
```

[Cryptographic algorithms](https://docs.aws.amazon.com/crypto/latest/userguide/concepts-algorithms.html)
- Symmetric algorithms
- Asymmetric algorithms
