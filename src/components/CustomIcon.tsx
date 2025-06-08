import React, { useState, useEffect } from 'react';

interface CustomIconProps {
  name: string;
  size?: number;
  color?: string;
}

export const CustomIcon: React.FC<CustomIconProps> = ({ 
  name, 
  size = 24, 
  color = 'currentColor' 
}) => {
  const [svgContent, setSvgContent] = useState<string>('');

  useEffect(() => {
    // 获取SVG内容并注入到页面中
    fetch(`/svg/${name}.svg`)
      .then(response => response.text())
      .then(svg => {
        setSvgContent(svg);
      })
      .catch(error => {
        console.error(`Failed to load SVG: ${name}`, error);
      });
  }, [name]);

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