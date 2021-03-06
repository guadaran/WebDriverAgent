/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import PropTypes from 'prop-types';
import React from 'react';

import HTTP from 'js/http';
import GestureRecognizer from 'js/gesture_recognizer';
import {debounce} from 'throttle-debounce';

require('css/screen.css');

class Screen extends React.Component {
  constructor() {
    super();
    this.typedKeys = "";
    this.debounceOnScreenShotKeyDown = debounce(200, this.onScreenShotKeyDown);
  }
  componentWillMount() {
     document.addEventListener('keydown', this.onKeyDown.bind(this), false);
  }

  componentWillUnmount() {
      document.removeEventListener('keydown', this.onKeyDown.bind(this), false);
  }

  componentDidMount() {
    this.screenEle = document.getElementById('screenshot');
  }

  render() {
    return (
      <div id="screen" className="section first">
        <div className="section-caption">
          Screen
        </div>
        <div>
          <button onClick={(ev) => {this.home(ev); }} >
            Home
          </button>
          <button onClick={(ev) => {this.volumeUp(ev); }} >
            Vol-up
          </button>
          <button onClick={(ev) => {this.volumeDown(ev); }} >
            Vol-down
          </button>
          <button style={{float:"right"}} onClick={(ev) => {this.disconnectDevice(ev)}} >
            Disconnect
          </button>
        </div>
        <div className="section-content-container">
          <div className="screen-screenshot-container"
            style={this.styleWithScreenSize()}>
            {this.renderScreenshot()}
            {this.renderHighlightedNode()}
          </div>
        </div>
      </div>
    );
  }

  gestureRecognizer() {
    if (!this._gestureRecognizer) {
      this._gestureRecognizer = new GestureRecognizer({
        onClick: (ev) => {
          this.onScreenShotClick(ev);
        },
        onDrag: (params) => {
          this.onScreenShotDrag(params);
        },
        onKeyDown: (key) => {
          this.typedKeys = this.typedKeys+key
          this.debounceOnScreenShotKeyDown(this.typedKeys);
        },
      });
    }
    return this._gestureRecognizer;
  }

  styleWithScreenSize() {
    var screenshot = this.screenshot();
    return {
      width: screenshot.width * screenshot.scale,
      height: screenshot.height * screenshot.scale,
    };
  }

  screenshot() {
    return this.props.screenshot ? this.props.screenshot : {};
  }

  onScreenShotDrag(params) {
    var fromX = params.origin.x - this.screenEle.offsetLeft;
    var fromY = params.origin.y - this.screenEle.offsetTop;
    var toX = params.end.x - this.screenEle.offsetLeft;
    var toY = params.end.y - this.screenEle.offsetTop;

    fromX = this.scaleCoord(fromX);
    fromY = this.scaleCoord(fromY);
    toX = this.scaleCoord(toX);
    toY = this.scaleCoord(toY);

    HTTP.post(
      'session/' + this.props.sessionId + '/wda/element/0/dragfromtoforduration',
      JSON.stringify({
        'fromX': fromX,
        'fromY': fromY,
        'toX': toX,
        'toY': toY,
        'duration': params.duration
      })
    );
  }

  scaleCoord(coord) {
    var screenshot = this.screenshot();
    //var pxPtScale = screenshot.width / this.props.rootNode.rect.size.width;
    var pxPtScale = screenshot.width / this.props.width;
    return coord / screenshot.scale / pxPtScale;
  }

  onScreenShotClick(point) {
    var x = point.x - this.screenEle.offsetLeft;
    var y = point.y - this.screenEle.offsetTop;
    x = this.scaleCoord(x);
    y = this.scaleCoord(y);

    HTTP.post(
      'session/' + this.props.sessionId + '/wda/tap/0',
      JSON.stringify({
        'x': x,
        'y': y,
      })
    );
  }

  onScreenShotKeyDown(key) {
    this.typedKeys = "";
      HTTP.post(
        'session/' + this.props.sessionId + '/wda/keys',
        JSON.stringify({
          'value': [key],
        })
      );
  }

  onMouseDown(ev) {
    this.gestureRecognizer().onMouseDown(ev);
  }

  onMouseMove(ev) {
    this.gestureRecognizer().onMouseMove(ev);
  }

  onMouseUp(ev) {
    this.gestureRecognizer().onMouseUp(ev);
  }

  onKeyDown(ev) {
    this.gestureRecognizer().onKeyDown(ev);
  }

  home(ev) {
    HTTP.post(
      '/wda/homescreen',
      JSON.stringify({})
    );
  }

  volumeUp(ev) {
    HTTP.post(
      '/wda/volumeUp',
      JSON.stringify({})
    );
  }
  volumeDown(ev) {
    HTTP.post(
      '/wda/volumeDown',
      JSON.stringify({})
    );
  }

  disconnectDevice() {
    if(this.props.onDisconnect) {
      this.props.onDisconnect();
    }
  }

  renderScreenshot() {
    return (
      <img
        className="screen-screenshot"
        src={this.screenshot().source}
        style={this.styleWithScreenSize()}
        onMouseDown={(ev) => this.onMouseDown(ev)}
        onMouseMove={(ev) => this.onMouseMove(ev)}
        onMouseUp={(ev) => this.onMouseUp(ev)}
        onMouseLeave={(ev) => this.onMouseUp(ev)}
        draggable="false"
        id="screenshot"
      />
    );
  }


  renderHighlightedNode() {
    if (this.props.highlightedNode == null) {
      return null;
    }

    const rect = this.props.highlightedNode.rect;
    return (
      <div
        className="screen-highlighted-node"
        style={this.styleForHighlightedNodeWithRect(rect)}/>
    );
  }

  styleForHighlightedNodeWithRect(rect) {
    var screenshot = this.screenshot();

    const elementsMargins = 4;
    const topOffset = screenshot.height;

    var scale = screenshot.scale;
    // Rect attribute use pt, but screenshot use px.
    // So caculate its px/pt scale automatically.
    var pxPtScale = screenshot.width / this.props.rootNode.rect.size.width;

    // hide nodes with rect out of bound
    if (rect.origin.x < 0 || rect.origin.x * pxPtScale >= screenshot.width ||
      rect.origin.y < 0 || rect.origin.y * pxPtScale >= screenshot.height){
        return {};
    }

    return {
      left: rect.origin.x * scale * pxPtScale,
      top: rect.origin.y * scale * pxPtScale - topOffset * scale - elementsMargins,
      width: rect.size.width * scale * pxPtScale,
      height: rect.size.height * scale * pxPtScale,
    };
  }
}

Screen.propTypes = {
  highlightedNode: PropTypes.object,
  screenshot: PropTypes.object,
};

module.exports = Screen;
