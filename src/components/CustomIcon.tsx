import React, { useState, useEffect } from 'react';

interface CustomIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const CustomIcon: React.FC<CustomIconProps> = ({ 
  name, 
  size = 24, 
  color = 'inherit' 
}) => {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    // 获取SVG内容并注入到页面中
    const basePath = process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL : '';
    fetch(`${basePath}/svg/${name}.svg`)
      .then(response => response.text())
      .then(svg => {
        // 修改SVG的width和height属性以匹配指定的size
        const modifiedSvg = svg
          .replace(/width="24"/, `width="${size}"`)
          .replace(/height="24"/, `height="${size}"`);
        setSvgContent(modifiedSvg);
      })
      .catch(error => {
        console.error(`Failed to load SVG: ${name}`, error);
      });
  }, [name, size]);

  if (!svgContent) {
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}; 