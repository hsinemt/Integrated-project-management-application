import { useState, useEffect } from 'react';
import axios from 'axios';
import { SidebarDataTest } from './sidebarMenu';
import { all_routes } from "../../../feature-module/router/all_routes";

/**
 * Function to get the sidebar menu data conditionally based on the student's group status
 * @returns The sidebar menu data with or without the "Add Group" button
 */
export const getConditionalSidebarData = async () => {
  try {
    // Only check for group status if the user is a student
    const userRole = localStorage.getItem('role');
    if (userRole !== 'student') {
      return SidebarDataTest;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
      console.error('User ID not found');
      return SidebarDataTest;
    }

    // Check if the student is already in a group
    const response = await axios.get(`http://localhost:9777/choix/check-student?studentId=${userId}`);
    const isInGroup = response.data.isInGroup;

    // If the student is already in a group, remove the "Add Group" button
    if (isInGroup) {
      // Deep clone the sidebar data
      const modifiedSidebarData = JSON.parse(JSON.stringify(SidebarDataTest));
      
      // Find the Student section
      const studentSection = modifiedSidebarData[0].submenuItems.find(
        (item: any) => item.label === 'Student'
      );
      
      if (studentSection && studentSection.submenuItems) {
        // Remove the "Add Group" button
        studentSection.submenuItems = studentSection.submenuItems.filter(
          (item: any) => item.label !== 'Add Group'
        );
      }
      
      return modifiedSidebarData;
    }
    
    return SidebarDataTest;
  } catch (error) {
    console.error('Error checking student group status:', error);
    return SidebarDataTest;
  }
};