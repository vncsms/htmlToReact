import React from 'react';
import {
  Modal,
  View,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  TextInput,
} from 'react-native';

import { WebView } from 'react-native-webview';

export default class WebPage extends React.Component {
  _isMounted = true;
  constructor(props) {
    super(props);

    this.state = {
      initialUrl: '',
      backVisible: false,
      currentUrl: '',
    };
  }

  goBack() {
    this.webview.goBack();
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    if(this.state.initialUrl != this.props.url){
      if(this._isMounted) {
        this.setState({
          initialUrl: this.props.url,
        });
      }
    }
  }

  _onNavigationStateChange(webViewState){
    this.setState({
      currentUrl: webViewState.url,
    })
    console.log(webViewState.url);
    if(this.state.initialUrl != webViewState.url) {
      this.setState({
        backVisible: true
      })
    } else {
      this.setState({
        backVisible: false
      })
    }
  }

  closeWeb() {
    this.props.closeWeb();
  }

  render() {
    let imageBack;
    if(this.state.backVisible){
      imageBack = <Image
                  style={ArticleStyle.imageIcon}
                  source={require('../assets/images/back.png')}/>
    } else {
      imageBack = <View style={ArticleStyle.imageIcon}/>
    }
    return (
      <Modal
        animationType = 'slide'
        visible = {this.props.modalWebVisible}
        onRequestClose={() => {this.closeWeb()}} >
        <View style={ArticleStyle.headContainer}>
          <View style={ArticleStyle.buttonContainer}>
            <View style = {{paddingRight: 10}}>
              <TouchableOpacity
                onPress={() => this.closeWeb()}
                style={ArticleStyle.backButton}>
                <Image
                  style={ArticleStyle.imageIcon}
                  source={require('../assets/images/close.png')}/>
              </TouchableOpacity>
            </View>
            <View style={{width: '80%', paddingTop: 4}}>
              <TextInput
                style={{height: 35,
                        borderRadius: 25,
                        paddingLeft: 20,
                        backgroundColor: 'gray',
                        paddingTop: 0,
                        paddingBottom: 0,
                        borderWidth: 1,
                        width: '100%',
                        color: 'white'}}
                onChangeText={(text) => this.setState({currentUrl: text})}
                editable={false}
                selectTextOnFocus={false}
                onSubmitEditing={() => this.props.changeUrl(this.state.currentUrl)}
                value={this.state.currentUrl}
              />
            </View>
          </View>
        </View>
        <WebView
          onNavigationStateChange={this._onNavigationStateChange.bind(this)}
          ref={r => this.webview = r}
          source={{uri: this.props.url}}
        />
      </Modal>
    );
  }
}

const ArticleStyle = {
  headContainer: {
    width: '100%',
    height: 50,
    backgroundColor: '#fbfbfb',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
      },
      android: {
        elevation: 5,
      },
    }),
    flexDirection: 'row',
  },
  buttonContainer: {
    left:0,
    height: 50,
    width: '100%',
    paddingTop: 5,
    flexDirection: 'row',
    backgroundColor: '#000',
  },
  backButton: {
    paddingLeft: 4,
    paddingTop: 7
  },
  imageIcon: {
    width:28,
    height: 28
  },
  closeButton: {
    paddingTop: 7,
    paddingRight: 4,
  },
};