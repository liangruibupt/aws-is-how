# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import numpy as np

class DummySensor(object):
    def __init__(self, mean=25, variance=1):
        self.mu = mean
        self.sigma = variance
        
    def read_value(self):
        return np.random.normal(self.mu, self.sigma, 1)[0]

if __name__ == '__main__':
    sensor = DummySensor()
    print(sensor.read_value())
