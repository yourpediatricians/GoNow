import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet } from 'react-native';

interface LogoProps {
  size?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  transparent?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 120,
  width,
  height,
  style,
  transparent = true,
}) => {
  const logoWidth = width || size;
  const logoHeight = height || size;

  const source = transparent
    ? require('../assets/images/logo_transparent.png')
    : require('../assets/images/logo.png');

  return (
    <Image
      source={source}
      style={[
        styles.logo,
        {
          width: logoWidth,
          height: logoHeight,
        },
        style,
      ]}
      resizeMode="contain"
    />
  );
};

const styles = StyleSheet.create({
  logo: {
    alignSelf: 'center',
  },
});
