import React, {Component} from 'react';
import {
  Platform,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Text,
  View,
  Image,
  Modal,
  WebView,
  ActivityIndicator
} from 'react-native';
import JSSoup from 'jssoup';
import WebPage from './WebPage.js';
import axios from 'axios';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { Table, TableWrapper, Col, Row, Rows, Cell } from 'react-native-table-component';

const Entities = require('html-entities').XmlEntities;

const entities = new Entities();

const { width, height } = Dimensions.get('window');

var debug = ""

class Tree {
    constructor(value) {
        this.value = value;
        this.parent = null;
        this.children = [];
    }

    addChild(node) {
        node.parent = this
        this.children.push(node)
    }
}

var SINGLE_TAGS = ['img', 'br', 'hr', 'area', 'base', 'command', 'embed',
               'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr']


export default class Parser extends Component<Props> {

  constructor(props) {
    super(props);

    this.state = {
      articleReactIntro: <View></View>,
      articleReact: <View></View>,
      articleTitle: '',
      modalVisible: false,
      articleAvatar: '',
      links: [],
      actualArticle: '',
      modalWebVisible: false,
      urlWeb: '',
      isFavorite: false,
      initialUid: '',
      showFavorite: false,
      infoboxItems: [],
    };

    this.openImage = this.openImage.bind(this);
    this.closeImage = this.closeImage.bind(this);
    this.openWeb = this.openWeb.bind(this);
    this.closeWeb = this.closeWeb.bind(this);
    this.changeUrl = this.changeUrl.bind(this);
  }

  tolkenizer(html) {
    var tokens = [];
    var mytoken = '';
    for (var i = 0; i < html.length; i++) {
      letter = html[i];
      if (letter == '<'){
        if (mytoken != ''){
          tokens.push(mytoken);
        }
        mytoken = letter;
      } else if (letter == '>') {
        if (mytoken != '') {
          mytoken += letter;
          tokens.push(mytoken);
          mytoken = '';
        }

      } else {
        mytoken += letter
      }
    }
    return tokens;
  }

  maketree(lt) {

    var stack = []
    tree = new Tree('<html>');

    for ( var i = 0 ; i < lt.length; i++) {
      var token = lt[i];

      if(token.includes('<') && (!token.includes('</') || token.includes('/>'))) {
        tag = token.split(" ",1)[0].replace('<', '');
        tag = tag.replace('>', '');
        new_node = new Tree(token);
        tree.addChild(new_node);
        if (!SINGLE_TAGS.includes(tag)) {
          tree = new_node;
          stack.push(tag)
        }
      } else if(token.includes('</')) {
        tag = token.split(" ",1)[0].replace('<', '');
        tag = tag.replace(">", "").replace("/", "");
        results = stack.reduce((arr, x, i) => x == tag ? arr.concat(i) : arr, []);
        if (results.length != 0) {
          pos = results[results.length - 1];
          stack.splice(pos, 1);
        }
        tree = tree.parent
      } else if(token.includes('/>')) {
        new_node = new Tree(token);
        tree.addChild(new_node);
      } else {
        stack.push(token)
        new_node = new Tree(token)
        tree.addChild(new_node);
      }
    }
    while (tree.parent) {
      tree = tree.parent;
    }
    return tree;
  }

  getStyles(css) {
    var estilos = []
    if(css.includes('image-caption')) {
      estilos.push(ArticleStyle.textCaption);
    }
    if(css.includes('h1')) {
      estilos.push(ArticleStyle.h1);
    }
    if(css.includes('h2')) {
      estilos.push(ArticleStyle.h2);
    }
    if(css.includes('b')) {
      estilos.push(ArticleStyle.b);
    }
    if(css.includes('i')) {
      estilos.push(ArticleStyle.i);
    }
    if(css.includes('sup')) {
      estilos.push(ArticleStyle.sup);
    }
    if(css.includes('u')) {
      estilos.push(ArticleStyle.u);
    }
    if(css.includes('a')) {
      estilos.push(ArticleStyle.a);
    }
    if(css.includes('li')) {
      estilos.push(ArticleStyle.liText);
    }
    if (estilos.length > 0) {
      return estilos;
    } else {
      return [ArticleStyle.text];
    }
  }

  isThereUl(tree) {
    var tag = tree.value.split(" ",1)[0].replace('<', '');
    tag = tag.replace('/>', '').replace('>','');


    var listValid = false;
    if (tree.children.length > 0) {
      for (var i = 0 ; i < tree.children.length ; i++){
        var temp = this.isThereUl(tree.children[i]);
        listValid = temp ? true : listValid;
      }
    }

    if(tag == 'ul' || tag == 'ol') {
      return true;
    } else {
      return listValid;
    }
  }

  isThereImage(tree){
    var tag = tree.value.split(" ",1)[0].replace('<', '');
    tag = tag.replace('/>', '').replace('>','');

    var imageValid = false;

    if (tree.children.length > 0) {
      for (var i = 0 ; i < tree.children.length ; i++){
        temp = this.isThereImage(tree.children[i]);
        imageValid = temp ? true : imageValid;
      }
    }

    if(tag == 'img') {
      return true;
    } else {
      return imageValid;
    }
  }

  openImage() {
    this.setState({
      modalVisible: true
    });
  }

  closeImage() {
    this.setState({
      modalVisible: false
    });
  }

  openWeb() {
    this.setState({
      modalWebVisible: true
    });
  }

  closeWeb() {
    this.setState({
      modalWebVisible: false
    });
  }

  changeUrl(url) {
    this.setState({
      urlWeb: url,
    })
  }

  getArticle(uid) {
    if(this.props.typeArticle == 'article') {
      var url = 'https://www.prisvo.com/api/v1/article/'+uid+'?get_highlighted_edition=true';
      return axios.get(url);
    } else if (this.props.typeArticle == 'articleblog') {
      var url = 'https://www.prisvo.com/api/v1/articleblog/'+uid+'?get_highlighted_edition=true';
      return axios.get(url);
    }
  }

  favorite(uid) {
    var url;
    var data;
    if(this.props.typeArticle == 'article') {
      url = 'https://www.prisvo.com/api/v1/favorite/article';
      data = {
        article: uid
      }
    } else if (this.props.typeArticle == 'articleblog') {
      url = 'https://www.prisvo.com/api/v1/favorite/articleblog';
      data = {
        article_blog: uid
      }
    }
    return axios.post(url, data, {headers: { "Authorization" : 'Token ' + this.props.token}});
  }

  desfavorite(uid) {
    var url = '';
    if(this.props.typeArticle == 'article') {
      url = 'https://www.prisvo.com/api/v1/favorite/article/' + uid;
    } else if (this.props.typeArticle == 'articleblog') {
      url = 'https://www.prisvo.com/api/v1/favorite/articleblog/' + uid;
    }
    return axios.delete(url, {headers: { "Authorization" : 'Token ' + this.props.token}});
  }

  getFavorite(uid) {
    var url = '';
    if(this.props.typeArticle == 'article') {
      url = 'https://www.prisvo.com/api/v1/favorite/article/' + uid;
    } else if (this.props.typeArticle == 'articleblog') {
      url = 'https://www.prisvo.com/api/v1/favorite/articleblog/' + uid;
    }
    return axios.get(url, {headers: { "Authorization" : 'Token ' + this.props.token}});
  }

  appendUrl(uid) {
    this.setState({
      links: this.state.links.concat(uid),
    })
  }

  turnInto(tree, css){

    console.log(tree.value);

    var cssList = []
    cssList = cssList.concat(css);

    tag = tree.value.split(" ",1)[0].replace('<', '');
    tag = tag.replace('/>', '').replace('>','');

    var soup = new JSSoup(tree.value);
    var tagsoup = soup.find(tag);
    if (tagsoup) {
      if(tagsoup.attrs.class) {
        cssList = cssList.concat(tagsoup.attrs.class.split(" "));
      }
    }

    if (tree.value.includes('<') && tree.value.includes('>')) {
      if (tag == 'h1') {
        cssList.push('h1');
      } else if (tag == 'h2') {
        cssList.push('h2');
      } else if (tag == 'h3') {
        cssList.push('h3');
      } else if (tag == 'b') {
        cssList.push('b');
      } else if (tag == 'sup') {
        cssList.push('sup');
      } else if (tag == 'strong') {
        cssList.push('b');
      } else if (tag == 'em') {
        cssList.push('i');
      } else if (tag == 'i') {
        cssList.push('i');
      } else if (tag == 'u') {
        cssList.push('u');
      } else if (tag == 'li') {
        cssList.push('li');
      } else if (tag == 'a') {
        cssList.push('a');
      } else if (tag == 'blockquote') {
        cssList.push('i');
      }
    }

    var tag = tree.value.split(" ",1)[0].replace('<', '');
    tag = tag.replace('/>', '').replace('>','');

    if(!tree.value.includes('<') && !tree.value.includes('>')) {
      var estilos = this.getStyles(cssList);
      if(tree.value != "") {
        return <Text style={estilos}>{tree.value}</Text>;
      } else {
        return null;
      }
    }

    var cps = [];
    var tempIl = []
    if (tree.children.length > 0) {
      if (tag == 'li') {
        if(this.isThereUl(tree)) {
          var isText = false;
          for (var i = 0 ; i < tree.children.length ; i++){
            var tag2 = tree.children[i].value.split(" ",1)[0].replace('<', '');
            tag2 = tag2.replace('/>', '').replace('>','');

            if((!tree.children[i].value.includes('<') && !tree.children[i].value.includes('>'))) {
              tempIl.push(this.turnInto(tree.children[i], cssList));
            } else {
              if(tempIl.length!=0) {
                cps.push(<View style={ArticleStyle.liContainer}>
                           <Text style={ArticleStyle.li}>{tempIl.map(value => (value))}</Text>
                         </View>);
                tempIl = [];
              }
              cps.push(this.turnInto(tree.children[i], cssList));
            }
          }
        } else {
          for (var i = 0 ; i < tree.children.length ; i++){
            cps.push(this.turnInto(tree.children[i], cssList));
          }
          return <View style={ArticleStyle.liContainer}>
                   <Text style={ArticleStyle.li}>{cps.map(value => (value))}</Text>
                 </View>;
        }
        if(tempIl.length!=0) {
          cps.push(<View style={ArticleStyle.liContainer}>
                     <Text style={ArticleStyle.li}>{tempIl.map(value => (value))}</Text>
                   </View>);
          tempIl = [];
        }
        return <View style={ArticleStyle.liContainer}>
                 <View></View>
                 <View style={ArticleStyle.li}>{cps.map(value => (value))}</View>
               </View>
      } else {
        for (var i = 0 ; i < tree.children.length ; i++){
          cps.push(this.turnInto(tree.children[i], cssList));
        }
      }
    }

    switch (tag) {
      case "head":
        return <View>{cps.map(value => (value))}</View>;
      case "p":
        if(this.isThereImage(tree)) {
          return <View>{cps.map(value => (value))}</View>;
        }
        return <Text style={ArticleStyle.p}>{cps.map(value => (value))}</Text>;
      case "html":
        return <View style={ArticleStyle.articleContent}>{cps.map(value => (value))}</View>;
      case "div":
        return <View>{cps.map(value => (value))}</View>;
      case "body":
        return <View>{cps.map(value => (value))}</View>;
      case "span":
        if(this.isThereImage(tree)) {
          return <View>{cps.map(value => (value))}</View>;
        }
        return <Text>{cps.map(value => (value))}</Text>;
      case "title":
        return <View>{cps.map(value => (value))}</View>;
      case "h1":
        return <View>{cps.map(value => (value))}</View>;
      case "h2":
        return <View>{cps.map(value => (value))}</View>;
      case "h3":
        return <View>{cps.map(value => (value))}</View>;
      case "ul":
        return <View style={ArticleStyle.ul}>
                 {cps.map((value, index) => (
                    <View style={{flexDirection: 'row'}}><View style={ArticleStyle.liTopic}>{circle}</View>{value}</View>
                   ))}
               </View>;
      case "ol":
        return <View style={ArticleStyle.ul}>
                 {cps.map((value, index) => (
                    <View style={{flexDirection: 'row'}}><Text>{index+1}. </Text>{value}</View>
                   ))}
               </View>;
      case "li":
        if(this.isThereUl(tree)) {
          return <View style={ArticleStyle.li}>{circle}{cps.map(value => (value))}</View>;
        }
        return <Text style={ArticleStyle.li}>{circle} {cps.map(value => (value))}</Text>;
      case "blockquote":
        return <View style={ArticleStyle.blockquote}>{cps.map(value => (value))}</View>;
      case "b":
        return <Text>{cps.map(value => (value))}</Text>;
      case "strong":
        return <Text>{cps.map(value => (value))}</Text>;
      case "em":
        return <Text>{cps.map(value => (value))}</Text>;
      case "i":
        return <Text>{cps.map(value => (value))}</Text>;
      case "sup":
        return <Text>{cps.map(value => (value))}</Text>;
      case "cite":
        return <Text>{cps.map(value => (value))}</Text>;
      case "br":
        return <Text>{"\n"}</Text>;
      case "a":
        var soup = new JSSoup(tree.value);
        var img = soup.find('a');
        var url = img.attrs.href;
        // if (url.includes('https://www.prisvo.com/article/')) {
        //   url = url.split('https://www.prisvo.com/article/')[1];
        //   url = url.split('/')[0];
        //   return <Text onPress={() => this.foward(url)}>{cps.map(value => (value))}</Text>;
        // } else {
        //   return <Text onPress={() => this.webFoward(url)}>{cps.map(value => (value))}</Text>;
        // }
        return <Text onPress={() => this.webFoward(url)}>{cps.map(value => (value))}</Text>;
      case "u":
        return <Text>{cps.map(value => (value))}</Text>;
      case "img":
        var soup = new JSSoup(tree.value);
        var img = soup.find('img');
        var url = img.attrs.src;
        if(!url.includes('https:')) {
          url = 'https:' + url;
        }
        var imgClass = img.attrs.class;
        if(imgClass && imgClass.includes('image-expanded')) {
          return <View style={ArticleStyle.blogThumbImageContainer}>
                   <TouchableOpacity onPress={() => this.zoom(url)}>
                     <Image style={ArticleStyle.blogThumbImage} source={{uri: url}}/>
                   </TouchableOpacity>
                 </View>;
        } else {
          return <View style={ArticleStyle.thumbImageContainer}>
                   <TouchableOpacity onPress={() => this.zoom(url)}>
                     <Image style={ArticleStyle.thumbImage} source={{uri: url}}/>
                   </TouchableOpacity>
                 </View>;
        }
    }
  }

  foward(uid) {
    this.appendUrl(this.state.actualArticle);
    this.loadArticle(uid)
  }

  webFoward(url) {
    this.openWeb();
    this.changeUrl(url);
  }

  loadArticle(uid) {

    this.setState({
      articleReact: <View></View>,
      showFavorite: false,
      articleTitle: '',
      articleAvatar: '',
      articleReactIntro: <View></View>,
      isLoading: true,
      favorite: false,
    });

    this.getArticle(uid).then(res => {
      this.setState({
        actualArticle: uid,
      });
      if(this.props.typeArticle == 'article') {
        if (Array.isArray(res.data.quick_read)) {
          this.setState({
            infoboxItems: res.data.quick_read,
          })
        } else {
          if (res.data.quick_read.enabled) {
          this.setState({
            infoboxItems: res.data.quick_read.items,
          })
          } else {
            this.setState({
              infobox: [],
            })
          }
        }
      }

      var code = entities.decode(res.data.body);

      code = code.replace(/&#8203;/g, '');
      code = code.replace(/\n/g,'');
      code = code.replace(/<br\/>/g,'<br>');
      code = code.replace(/\u21b5/g,'');
      code = code.replace(/&nbsp;/g, ' ');
      tokens = this.tolkenizer(code);
      tree = this.maketree(tokens);
      articleReact = this.turnInto(tree, []);
      this.setState({
        articleReact: articleReact,
        articleTitle: res.data.title,
      });

      if (res.data.avatar) {
        this.setState({
          articleAvatar: res.data.avatar.m,
        });
      } else {
        this.setState({
          articleAvatar: '',
        });
      }

      var newIntro = entities.decode(res.data.introduction);

      tokens = this.tolkenizer(newIntro);
      tree = this.maketree(tokens);
      articleReactIntro = this.turnInto(tree, []);
      this.setState({
        articleReactIntro: articleReactIntro,
      });
      this.setState({
        isLoading: false,
      })
      this.getFavorite(uid).then(res => {
        this.setState({
          favorite: res.data.detail,
          showFavorite: true,
        })
      }).catch((err) => {
      })
    }).catch((err) => {
      console.log(err);
      this.setState({
        isLoading: false,
      })
    })
  }

/*  componentWillMount() {
    uid = '_e5be58226753';
    this.loadArticle(uid);
  }
*/
  componentDidUpdate() {
    if(this.state.initialUid != this.props.uid){
      this.setState({
        initialUid: this.props.uid,
      });
      this.loadArticle('_fe8d4004b865');
    }
  }

  zoom(image) {
    this.setState({
      image: image,
    })
    this.openImage();
  }

  goBack() {
    if(this.state.links.length != 0) {
      uid = this.state.links[this.state.links.length-1];
      var links = this.state.links;
      links.pop();
      this.setState({
        links: links
      })
      this.loadArticle(uid);
    }
  }

  closeArticle() {
    this.setState({
      links: [],
      infoboxItems: [],
    });
    this.props.closeArticle();
  }

  toogleFavorite(uid) {
    if(!this.state.isFavorite){
      this.setState({
        isFavorite: true,
      });
      if (this.state.favorite) {
        this.desfavorite(uid).then(res => {
          this.setState({
            favorite: false,
            isFavorite: false,
          })
        }).catch((err) => {
           console.log(err);
           this.setState({
             isFavorite: false,
           });
        })
      } else {
        this.favorite(uid).then(res => {
          this.setState({
            favorite: true,
            isFavorite: false,
          })
        }).catch((err) => {
           console.log(err);
           this.setState({
             isFavorite: false,
           });
        })
      }
    }
  }

  render() {

    let avatar = <View></View>;

    if (this.state.articleAvatar != '' && this.props.typeArticle == 'article') {
      avatar = <TouchableOpacity onPress={() => this.zoom(this.state.articleAvatar)}>
                  <Image style={ArticleStyle.avatarImage} source={{uri: this.state.articleAvatar}}/>
               </TouchableOpacity>
    } else {
      avatar = <View></View>
    }

    let avatarBlog = <View></View>;

    if (this.state.articleAvatar != '' && this.props.typeArticle == 'articleblog') {
      avatarBlog = <TouchableOpacity onPress={() => this.zoom(this.state.articleAvatar)}>
                     <Image style={ArticleStyle.avatarImage} source={{uri: this.state.articleAvatar}}/>
                   </TouchableOpacity>
    } else {
      avatarBlog = <View></View>
    }

    let loading = <View></View>;

    if (this.state.isLoading) {
      loading = <View style={ArticleStyle.loadingIcon}>
                  <ActivityIndicator size="large" color="#0000ff" />
                </View>
    } else {
      loading = <View></View>
    }

    let backButton = <View style={ArticleStyle.iconInnerContainer}></View>;

    if (this.state.links.length) {
      backButton = <TouchableOpacity
                     onPress={() => this.goBack()}
                     style={ArticleStyle.backButton}>
                     <Image
                       style={ArticleStyle.imageIcon}
                       source={require('../assets/images/back.png')}/>
                   </TouchableOpacity>
    } else {
      backButton = <View style={ArticleStyle.iconInnerContainer}></View>
    }

    let bookmark = <View></View>

    if (this.state.favorite) {
      bookmark =  <Icon name="bookmark" solid size={25} color="#000" />
    } else {
      bookmark =  <Icon name="bookmark" light size={25} color="#000" />
    }

    let bookmarkContainer = <View style={ArticleStyle.iconInnerContainer}></View>;

    if (this.state.showFavorite && this.props.token!= '') {
      bookmarkContainer = <TouchableOpacity
                            onPress={() => this.toogleFavorite(this.state.actualArticle)}
                            style={ArticleStyle.closeButton}>
                            {bookmark}
                          </TouchableOpacity>
    } else {
      bookmarkContainer = <View style={ArticleStyle.iconInnerContainer}></View>
    }

    let infobox = <View/>

    if(this.state.infoboxItems.length > 0) {
      infobox = <View style={ArticleStyle.infoboxContainer}>
                   <ScrollView horizontal={true} style={{height: 60}}>
                     <View style={ArticleStyle.infoboxInnerContainer}>
                       {this.state.infoboxItems.map(value => (
                         <View style={ArticleStyle.infoboxItemContainer}>
                           <View><Text style={ArticleStyle.titleInfobox}>{value.attr}</Text></View>
                           <View><Text ellipsizeMode = 'tail' numberOfLines={6} style={ArticleStyle.infoboxContent}>{value.value}</Text></View>
                         </View>
                         )
                       )}
                     </View>
                   </ScrollView>
                </View>
    } else {
      infobox = <View></View>
    }

    return (
      <Modal animationType = 'fade'
             onRequestClose = {() => this.closeArticle()}
             visible = {this.props.modalVisible}>
        {loading}
        <Modal  animationType = 'fade'
                onRequestClose = {() => this.closeImage()}
                visible = {this.state.modalVisible}>
          <View style={ArticleStyle.modalContainer}>
            <View style={ArticleStyle.topBar}>
              <TouchableOpacity
                onPress={() => this.closeImage()}>
                <Image
                  style={ArticleStyle.closeButton}
                  source={require('../assets/images/close.png')}/>
              </TouchableOpacity>
            </View>
            <View>
              <TouchableOpacity style={ArticleStyle.zoomImage} onPress={() => this.closeImage()}>
                <Image  style={ArticleStyle.thumbImageZoom} source={{uri: this.state.image}}/>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <WebPage url={this.state.urlWeb}
                 modalWebVisible={this.state.modalWebVisible}
                 changeUrl={this.changeUrl}
                 closeWeb={this.closeWeb}/>
        <View style={ArticleStyle.headContainer}>
          <View style={ArticleStyle.buttonContainer}>
            <View>
              {backButton}
            </View>
            <View style={ArticleStyle.titleTobBar}>
              <Text
                ellipsizeMode = 'tail'
                numberOfLines={1}
                style={ArticleStyle.titleTobBarText}>
                {this.state.articleTitle}
              </Text>
            </View>
            <View style={ArticleStyle.iconsContainer}>
              {bookmarkContainer}
              <TouchableOpacity
                onPress={() => this.closeArticle()}
                style={ArticleStyle.closeButton}>
                <Image
                    style={ArticleStyle.imageIcon}
                    source={require('../assets/images/close.png')}/>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        <ScrollView>
          <View style={ArticleStyle.article}>
            {avatarBlog}
            <View style={ArticleStyle.titleContainer}>
              <Text style={ArticleStyle.title}>
                {this.state.articleTitle}
              </Text>
            </View>
            <View style={ArticleStyle.introContainer}>
              {this.state.articleReactIntro}
            </View>
            {avatar}
            {infobox}
            {this.state.articleReact}
          </View>
        </ScrollView>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 30, backgroundColor: '#fff' },
  head: {  height: 40,  backgroundColor: '#f1f8ff'  },
  wrapperRow: { flexDirection: 'row' },
  wrapperColumn: { flexDirection: 'column' },
  title: { flex: 1, backgroundColor: '#f6f8fa' },
  row: {  height: 28  },
  text: { textAlign: 'center', fontSize: 15, margin: 6 }
});

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
  avatarImage: {
    width: width,
    height:300
  },
  iconInnerContainer: {
    width: 28,
    height: 28
  },
  titleInfobox: {
    color: '#fff',
    fontWeight: 'bold'
  },
  infoboxContainer: {
    backgroundColor: '#0066d0',
    width: '100%',
    height: 150
  },
  infoboxInnerContainer: {
    flexDirection: 'row',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 10
  },
  infoboxItemContainer: {
    maxWidth: width,
    padding: 10
  },
  infoboxContent: {
    color: '#fff'
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  thumbImageContainer: {
    paddingBottom: 10,
    paddingTop: 10,
  },
  blogThumbImageContainer: {
    paddingBottom: 0,
    paddingTop: 10,
    marginLeft: -20,
  },
  liContainer: {
    flexDirection: 'row'
  },
  liTopic: {
    paddingTop: 3,
    paddingRight: 5
  },
  closeButton: {
    width: 30,
    height: 30,
    paddingTop: 7,
    paddingRight: 4,
  },
  thumbImage: {
    width: '100%',
    height: 300
  },
  blogThumbImage: {
    width: width,
    height: 300
  },
  titleTobBar: {
    width: '60%',
    paddingLeft: 10,
  },
  thumbImageZoom: {
    width: '100%',
    height: 300
  },
  titleTobBarText: {
    paddingTop: 10,
    fontSize: 15
  },
  loadingIcon: {
    position: 'absolute',
    bottom: height/2,
    width: '100%',
    zIndex: 11 ,
    alignItems: 'center'
  },
  modalContainer: {
    width: '100%',
    height: '100%',
    backgroundColor: 'white'
  },
  zoomImage: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    left:0,
    height: 50,
    width: '100%',
    paddingTop: 5,
    flexDirection: 'row',
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  topBar: {
    position: 'absolute',
    right: 10,
    top: 10
  },
  backButton: {
    paddingLeft: 4,
    paddingTop: 7
  },
  imageIcon: {
    width:28,
    height: 28
  },
  article: {
    paddingBottom: 100,
    width: width
  },
  articleContent: {
    paddingTop: 50,
    paddingLeft: 20,
    paddingRight: 20,
  },
  p: {
    width: '100%',
    paddingBottom: 10,
  },
  text: {
    fontSize: 20,
    color: 'black',
  },
  textCaption: {
    fontSize: 13,
    color: 'black',
    paddingBottom: 20,
  },
  title: {
    fontSize: 40,
    color: 'black',
    fontWeight: 'bold',
    fontFamily: 'Open Sans',
  },
  titleContainer: {
    paddingLeft: 20,
    paddingTop: 80,
    paddingRight: 20,
  },
  introContainer: {
    paddingBottom: 50,
  },
  a: {
    fontSize: 20,
    color: 'blue',
    textDecorationLine: 'underline',
  },
  h1: {
    fontSize: 25,
    color: 'black',
    fontWeight: 'bold',
  },
  h2: {
    fontSize: 22,
    color: 'black',
    fontWeight: 'bold',
  },
  h3: {
    fontSize: 20,
    color: 'black',
  },
  ul: {
    paddingLeft: 20,
    paddingTop: 5,
    paddingBottom: 10,
    width: '100%',
    flexDirection: 'column',
  },
  li: {
    width: '100%',
    flexDirection: 'column',
  },
  liText: {
    fontSize: 15,
    color: 'black',
  },
  liIcon: {
    width: 15,
    height: 15,
  },
  u: {
    fontSize: 20,
    textDecorationLine: 'underline',
    color: 'black',
  },
  b: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
  i: {
    fontSize: 20,
    fontStyle: 'italic',
    color: 'black',
  },
  sup: {
    fontSize: 15,
    color: 'black',
    paddingRight: 10,
  },
  blockquote: {
    borderLeftWidth: 5,
    borderColor: '#e6e6e6',
    paddingLeft: 30,
    paddingBottom: 10,
  }

}

const circle = <Icon name="circle" solid size={15} color="#000" />;