
from sklearn.externals import joblib
import sys

def classifyData(X_test):
    # Load the model from the file
    modelRF = joblib.load('rfModel.pkl')
    # Use the loaded model to make predictions
    return modelRF.predict(X_test)


if __name__=="__main__":
    print(sys.argv[1])