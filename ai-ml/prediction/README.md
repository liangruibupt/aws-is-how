# Prediction

Classical forecasting methods, such as autoregressive integrated moving average (ARIMA) or exponential smoothing (ETS), fit a single model to each individual time series. They then use that model to extrapolate the time series into the future. 

The Amazon SageMaker DeepAR forecasting algorithm is a supervised learning algorithm for forecasting scalar (one-dimensional) time series using recurrent neural networks (RNN)
. You can benefit from training a single model jointly over all of the time series. You can also use the trained model to generate forecasts for new time series that are similar to the ones it has been trained on. 

## DeepAR Hyperparameters
https://docs.aws.amazon.com/sagemaker/latest/dg/deepar_hyperparameters.html 

## Tune a DeepAR Model
https://docs.aws.amazon.com/sagemaker/latest/dg/deepar-tuning.html
- Metrics Computed by the DeepAR Algorithm
- Tunable Hyperparameters for the DeepAR Algorithm 

## Samples
1. This [sample notebook](script/deepar_synthetic.ipynb) demonstrates how to prepare a dataset of time series for training DeepAR and how to use the trained model for inference.

2. Use DeepAR on SageMaker for [predicting energy consumption](script/DeepAR-Electricity.ipynb) of 370 customers over time, based on a public electricity dataset

3. [Predict whether a customer will enroll for a certificate of deposit](script/predict_enroll_certificate_deposit.ipynb)

4. [Sample Stock Prediction](https://github.com/aws-samples/amazon-sagemaker-stock-prediction-archived)