import { useState, useEffect } from 'react';
import axios from 'axios';
import { SidebarDataTest } from './sidebarMenu';
import { all_routes } from "../../../feature-module/router/all_routes";

/**
 * Function to get the sidebar menu data conditionally based on the user's role and status
 * @returns The sidebar menu data customized for the user's role
 */
export const getConditionalSidebarData = async () => {
  try {
    // Get user role from localStorage
    const userRole = localStorage.getItem('role');

    // Create a deep clone of the sidebar data
    const modifiedSidebarData = JSON.parse(JSON.stringify(SidebarDataTest));

    // Filter menu items based on user role
    if (userRole) {
      const mainMenu = modifiedSidebarData[0].submenuItems;

      // Show only relevant sections based on user role
      switch(userRole) {
        case 'admin':
          // Admin sees all sections
          break;
        case 'manager':
          // Manager sees only Manager and common sections
          modifiedSidebarData[0].submenuItems = mainMenu.filter((item: any) => 
            item.label === 'Manager' || item.label === 'Main Menu'
          );
          return modifiedSidebarData;
        case 'tutor':
          // Tutor sees only Tutor and common sections
          modifiedSidebarData[0].submenuItems = mainMenu.filter((item: any) => 
            item.label === 'Tutor' || item.label === 'Main Menu'
          );
          return modifiedSidebarData;
        case 'student':
          // Continue with student-specific logic
          break;
      }
    }

    // Only check for group status if the user is a student
    if (userRole !== 'student') {
      return modifiedSidebarData;
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
