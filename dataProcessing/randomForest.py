import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn import model_selection
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn import svm
from sklearn.preprocessing import MinMaxScaler
import matplotlib.pyplot as plt
from sklearn.neighbors import KNeighborsClassifier
from sklearn.naive_bayes import GaussianNB
import seaborn as sns
import joblib
import pickle
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.ensemble import BaggingClassifier
from sklearn.tree import DecisionTreeClassifier


# features = pd.read_csv('params_trial.csv')
features = pd.read_csv('params_trial.csv', usecols=['deviceState','usedMemory','bufferCache', 'availableMemory', 'Memory Utilization_kbcommit'])
# cols = ['deviceState', 'usedMemory', 'bufferCache', 'availableMemory']
# cols = ['deviceState','usedMemory','bufferCache', 'availableMemory', 'IOStats_wtps']
# features = pd.read_csv('params_trial.csv', usecols=cols)

features = features.dropna()
labels = np.array(features['deviceState'])
features= features.drop('deviceState', axis = 1)
# features= features.drop('CPU Utilization_CPU', axis = 1)
# features= features.drop('Disk Device Status_DEV', axis = 1)
# features= features.drop('', axis = 1)
# features= features.drop('', axis = 1)

# nunique = features.nunique()
# cols_to_drop = nunique[nunique == 1].index
# features.drop(cols_to_drop, axis=1)
# features = features.drop(features.std()[(features.std() == 0)].index, axis=1)

# print(features.head())
# feature_list = list(features.columns)
# features = np.array(features)

# scaler = MinMaxScaler(feature_range = (0,1))
# scaler = scaler.fit(features)
# scaled_features = scaler.fit_transform(features)
scaled_features = StandardScaler().fit_transform(features)

# pca = PCA(n_components=15)
# principalComponents = pca.fit_transform(features)
# scaled_features = pd.DataFrame(data = principalComponents)
# scaled_features = StandardScaler().fit_transform(features)
# print(scaled_features.head())


# def correlation_heatmap(features):
#     correlations = features.corr()

#     fig, ax = plt.subplots(figsize=(50,50))
#     sns.heatmap(correlations, vmax=1.0, center=0, fmt='.2f',
#                 square=True, linewidths=.5, annot=True, cbar_kws={"shrink": .70})
#     plt.show();
    
# correlation_heatmap(features)


train_features, test_features, train_labels, test_labels = train_test_split(scaled_features, labels, test_size = 0.25, random_state = 42)

# train_features, test_features, train_labels, test_labels = train_test_split(features, labels, test_size = 0.25, random_state = 42)
# print('Training Features Shape:', train_features.shape)
# print('Training Labels Shape:', train_labels.shape)
# print('Testing Features Shape:', test_features.shape)
# print('Testing Labels Shape:', test_labels.shape)

rf = RandomForestClassifier(n_estimators=1000)
rf.fit(train_features, train_labels)
print('Accuracy with RF:\t', accuracy_score(test_labels, rf.predict(test_features)))
joblib.dump(rf, 'models/rfModel.pkl')
#Decision Tree Classifier
from sklearn.tree import DecisionTreeClassifier
clf_gini = DecisionTreeClassifier(criterion = "gini", random_state = 100,max_depth=3, min_samples_leaf=5)

# Performing training
clf_gini.fit(train_features, train_labels)
print('Accuracy with DT:\t', accuracy_score(test_labels, clf_gini.predict(test_features)))

knn = KNeighborsClassifier(n_neighbors=8)
knn.fit(train_features, train_labels)
# Calculate the accuracy of the model
print('Accuracy with KNN:\t', knn.score(test_features, test_labels))

nbayes = GaussianNB()
nbayes.fit(train_features, train_labels)
print('Accuracy with NB:\t', accuracy_score(test_labels, nbayes.predict(test_features)))

model = svm.SVC(kernel='poly', degree=3)
model.fit(train_features, train_labels)
print('Accuracy with SVM:\t', accuracy_score(test_labels, model.predict(test_features)))

seed = 7
kFold = model_selection.KFold(n_splits=10, random_state=seed, shuffle=True)
cart = DecisionTreeClassifier()
numTrees = 100

model = BaggingClassifier(base_estimator=cart, n_estimators=numTrees, random_state=seed)
results = model_selection.cross_val_score(model, train_features, train_labels, cv=kFold)
for i in range(len(results)):
    print('\tModel: ' + str(i) + ' Accuracy is: ' + str(results[i]))

print('Average Accuracy:\t', results.mean())
